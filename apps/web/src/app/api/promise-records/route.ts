import crypto from "node:crypto"

import { NextResponse } from "next/server"
import { and, desc, eq, isNull } from "drizzle-orm"
import { z } from "zod"

import { companies } from "@/db/schema/companies"
import { departments } from "@/db/schema/departments"
import { promiseRecords } from "@/db/schema/promise-records"
import { users } from "@/db/schema/users"
import { getAuthUser, requireAuthUser } from "@/lib/server/auth"
import { getOrCreateAnonymousProfile } from "@/lib/server/anonymous-profile"
import { toPublicPromiseRecord } from "@/lib/server/promise-record-view"

const submissionSchema = z.object({
  companyId: z.uuid(),
  departmentId: z.uuid().nullable().optional(),
  promiseCategory: z.enum(["薪酬", "晋升", "工作地点", "岗位职责", "奖金", "其他"]),
  promiseText: z.string().trim().min(5).max(160),
  promiseDate: z.iso.date(),
  outcomeText: z.string().trim().min(5).max(160),
  outcomeStatus: z.enum(["kept", "partial", "broken"]),
  evidenceType: z.enum(["offer", "email", "chat", "policy", "other"]),
  evidenceReference: z.string().trim().min(3).max(300),
})

export async function POST(request: Request) {
  let authUser
  try {
    authUser = await requireAuthUser()
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }
  const parsed = submissionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "提交内容不完整" },
      { status: 400 }
    )
  }

  try {
    const { db } = await import("@/db/client")
    const [user] = await db
      .select({ trustLevel: users.trustLevel })
      .from(users)
      .where(eq(users.id, authUser.userId))
      .limit(1)
    if (!user || user.trustLevel < 2) {
      return NextResponse.json({ error: "完成任职证明后才能提交承诺记录" }, { status: 403 })
    }

    const data = parsed.data
    const [company] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.id, data.companyId), isNull(companies.deletedAt)))
      .limit(1)
    if (!company) return NextResponse.json({ error: "公司不存在" }, { status: 404 })

    if (data.departmentId) {
      const [department] = await db
        .select({ id: departments.id })
        .from(departments)
        .where(
          and(
            eq(departments.id, data.departmentId),
            eq(departments.companyId, data.companyId)
          )
        )
        .limit(1)
      if (!department) return NextResponse.json({ error: "部门不属于该公司" }, { status: 400 })
    }

    const anonymousProfile = await getOrCreateAnonymousProfile({
      userId: authUser.userId,
      scope: { scopeType: "company", scopeId: data.companyId },
      role: "anonymous",
    })
    const fingerprint = crypto
      .createHash("sha256")
      .update(`${data.evidenceType}:${data.evidenceReference}`)
      .digest("hex")

    const [record] = await db
      .insert(promiseRecords)
      .values({
        companyId: data.companyId,
        departmentId: data.departmentId ?? null,
        authorUserId: authUser.userId,
        anonymousProfileId: anonymousProfile.id,
        promiseCategory: data.promiseCategory,
        promiseText: data.promiseText,
        promiseDate: data.promiseDate,
        outcomeText: data.outcomeText,
        outcomeStatus: data.outcomeStatus,
        evidenceType: data.evidenceType,
        evidenceFingerprint: fingerprint,
        status: "pending_review",
      })
      .returning({ id: promiseRecords.id, status: promiseRecords.status })

    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    console.error("POST /api/promise-records failed:", error)
    return NextResponse.json({ error: "提交暂时不可用" }, { status: 503 })
  }
}

export async function GET(request: Request) {
  const companyId = new URL(request.url).searchParams.get("companyId")
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 })
  await getAuthUser()

  try {
    const { db } = await import("@/db/client")
    const rows = await db
      .select()
      .from(promiseRecords)
      .where(
        and(
          eq(promiseRecords.companyId, companyId),
          eq(promiseRecords.status, "visible"),
          isNull(promiseRecords.deletedAt)
        )
      )
      .orderBy(desc(promiseRecords.promiseDate))
      .limit(50)
    return NextResponse.json({ records: rows.map(toPublicPromiseRecord) })
  } catch {
    return NextResponse.json({ records: [] })
  }
}
