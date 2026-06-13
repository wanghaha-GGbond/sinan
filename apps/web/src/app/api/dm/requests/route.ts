/**
 * GET /api/dm/requests — 我的请求箱.
 * ?status=pending|accepted|rejected|withdrawn (可选)
 * 返回 { incoming, outgoing }, 接收方视角 (inbox) + 发起方视角 (sent).
 */
import { NextRequest, NextResponse } from "next/server"

import { getAuthUser } from "@/lib/server/auth"
import { listMyRequests } from "@/lib/server/dm-engine"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }
  const status = new URL(request.url).searchParams.get("status")
  const allowed = ["pending", "accepted", "rejected", "withdrawn"] as const
  const filtered = allowed.find((s) => s === status) as
    | (typeof allowed)[number]
    | undefined
  try {
    const result = await listMyRequests(user.userId, filtered)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
