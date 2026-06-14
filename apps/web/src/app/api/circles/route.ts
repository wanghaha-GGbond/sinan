/**
 * GET /api/circles — list active circles
 *
 * Per docs/04-spec-f3-growth.md §2: 公开端点, 返回 active 圈 + 当前用户的
 * 加入状态 + 成员数。无需鉴权。
 */
import { NextRequest, NextResponse } from "next/server"

import { listCircles, seedDefaultCircles } from "@/lib/server/circles"
import { getAuthUser } from "@/lib/server/auth"

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest) {
  void _request
  try {
    // 首次访问时自动 seed 首批 3 圈 (运营建圈的产物, 这里由 GET 触发一次性
    // 幂等写入, 后续 /admin 建圈将走另一条路)。
    await seedDefaultCircles()
    const user = await getAuthUser()
    const items = await listCircles(user?.userId ?? null)
    return NextResponse.json({ circles: items })
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
  }
}
