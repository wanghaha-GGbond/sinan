/**
 * POST /api/employer/reports/[companyId] — 运营代公司请求报告
 *   - 创建 draft 报告 → 模拟支付回调 (PATCH) → 生成聚合内容 → 标记 delivered
 *
 * 重要红线(08 §3):
 *   - content 字段必须是聚合数据(数值 / 百分比 / 列表),
 *     禁止任何 reviewer 引用 / 单条 review 内容
 *   - 用 sanitizeReportContent / buildAggregatedReportContent 兜底
 *
 * 本期(M4 探索期):不接真支付,只模拟状态机迁移
 */
import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"

import { employerReports } from "@/db/schema/m4-features"
import { users } from "@/db/schema/users"
import {
  buildAggregatedReportContent,
  EMPLOYER_REPORT_PRICE_CENTS_MIN,
  sanitizeReportContent,
} from "@/lib/server/p1-m4-services"

export const dynamic = "force-dynamic"

function mockAggregatedInsight(companyId: string) {
  // 真实生成在 M3.1+ 接数据;本期返回稳定 mock,确保 content 是聚合结构
  return buildAggregatedReportContent({
    windowDays: 30,
    reviewCount: 42,
    recommendRate: 71,
    avgDirectionScore: 3.6,
    departmentDistribution: {
      工程: 18,
      产品: 9,
      设计: 6,
      运营: 5,
      市场: 4,
    },
    riskTagCloud: {
      加班严重: 7,
      晋升缓慢: 4,
      沟通成本高: 3,
    },
    trend: [
      { date: "2026-05-13", count: 2, recommendRate: 80 },
      { date: "2026-05-20", count: 4, recommendRate: 70 },
      { date: "2026-05-27", count: 5, recommendRate: 75 },
      { date: "2026-06-03", count: 6, recommendRate: 65 },
    ],
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params
  try {
    const { db } = await import("@/db/client")
    const rows = await db
      .select()
      .from(employerReports)
      .where(eq(employerReports.companyId, companyId))
      .orderBy(desc(employerReports.createdAt))
      .limit(20)
    return NextResponse.json({ reports: rows })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), reports: [] },
      { status: 503 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { requireModerator } = await import("@/lib/server/auth")
  try {
    await requireModerator()
  } catch (resp) {
    if (resp instanceof Response) return resp
    throw resp
  }

  const { companyId } = await params
  if (!companyId) {
    return NextResponse.json({ error: "missing companyId" }, { status: 400 })
  }

  let body: { reportPeriod?: unknown; priceCents?: unknown; simulatePay?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (
    typeof body.reportPeriod !== "string" ||
    body.reportPeriod.trim().length === 0
  ) {
    return NextResponse.json({ error: "missing reportPeriod" }, { status: 400 })
  }
  const priceCents =
    typeof body.priceCents === "number"
      ? Math.round(body.priceCents)
      : 9900
  if (priceCents < EMPLOYER_REPORT_PRICE_CENTS_MIN) {
    return NextResponse.json({ error: "价格非法" }, { status: 400 })
  }

  try {
    const { db } = await import("@/db/client")

    // 默认周期 = 当前月
    const period = body.reportPeriod.trim()
    const content = mockAggregatedInsight(companyId)
    const sanitized = sanitizeReportContent(content)
    if (!sanitized) {
      // 不可能发生(mock 已构造聚合),但兜底
      return NextResponse.json(
        { error: "aggregated content sanitization failed" },
        { status: 500 }
      )
    }

    const [draft] = await db
      .insert(employerReports)
      .values({
        companyId,
        reportPeriod: period,
        content: sanitized,
        priceCents,
        status: "draft",
      })
      .onConflictDoNothing({
        target: [employerReports.companyId, employerReports.reportPeriod],
      })
      .returning()

    if (!draft) {
      // 已存在,直接返回
      const [existing] = await db
        .select()
        .from(employerReports)
        .where(
          and(
            eq(employerReports.companyId, companyId),
            eq(employerReports.reportPeriod, period)
          )
        )
        .limit(1)
      return NextResponse.json({ report: existing, created: false })
    }

    // 模拟支付回调(本期 M4 探索期):simulatePay=true 时把状态推到 paid → generated → delivered
    if (body.simulatePay === true) {
      await db
        .update(employerReports)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(employerReports.id, draft.id))

      await db
        .update(employerReports)
        .set({ status: "generated", generatedAt: new Date() })
        .where(eq(employerReports.id, draft.id))

      await db
        .update(employerReports)
        .set({ status: "delivered", deliveredAt: new Date() })
        .where(eq(employerReports.id, draft.id))
    }

    const [final] = await db
      .select()
      .from(employerReports)
      .where(eq(employerReports.id, draft.id))
      .limit(1)
    return NextResponse.json({ report: final, created: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}