/**
 * GET /api/users/[id]/circles — 用户所在圈层 (公开, active only)
 *
 * Per docs/04-spec-f3-growth.md §2: 圈层徽标展示在身份卡 (public profile)。
 * 不返回成员的 userId / displayName — 那些数据由具体圈层详情页 (受控访问) 暴露。
 */
import { NextRequest, NextResponse } from "next/server"

import { getUserCircles } from "@/lib/server/circles"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }
  try {
    const rows = await getUserCircles(id)
    return NextResponse.json({
      circles: rows.map((r) => ({
        circleId: r.circleId,
        circleName: r.circleName,
        circleSlug: r.circleSlug,
        minTrustLevel: r.minTrustLevel,
        joinedAt: r.joinedAt.toISOString(),
      })),
    })
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
  }
}
