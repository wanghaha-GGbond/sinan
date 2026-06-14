/**
 * GET /api/dm/threads — 当前用户的 thread 列表.
 * 每项只显示最新一条 preview + 对方段位。
 */
import { NextRequest, NextResponse } from "next/server"

import { getAuthUser } from "@/lib/server/auth"
import { listMyThreads } from "@/lib/server/dm-engine"

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest) {
  void _request
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }
  try {
    const threads = await listMyThreads(user.userId)
    return NextResponse.json({ threads })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
