/**
 * GET /api/visualizations/[companyId] — 脱敏聚合数据
 * 不返回任何 reviewer 引用 / 单条 review 内容 / 可定位个人数据
 */
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params
  if (!companyId) {
    return NextResponse.json({ error: "missing companyId" }, { status: 400 })
  }

  // 本期 mock(M3.1+ 接真数据)
  // 重要:任何 reviewer 引用 / 单条 review 内容都绝对不允许出现在这里
  const data = {
    companyId,
    departmentStats: [
      { department: "工程", count: 28 },
      { department: "产品", count: 12 },
      { department: "设计", count: 7 },
      { department: "运营", count: 6 },
      { department: "市场", count: 4 },
    ],
    hiringTrend30d: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000)
        .toISOString()
        .slice(0, 10),
      count: Math.floor(Math.random() * 6),
    })),
  }

  return NextResponse.json(data)
}