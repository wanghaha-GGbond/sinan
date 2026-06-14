/**
 * POST /api/dm/requests/[id]/accept — 接收方接受, 创建 (或复用) thread.
 */
import { NextRequest, NextResponse } from "next/server"

import { getAuthUser } from "@/lib/server/auth"
import { acceptRequest } from "@/lib/server/dm-engine"

export const dynamic = "force-dynamic"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }
  const { id: requestId } = await params
  if (!requestId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }
  try {
    const result = await acceptRequest(requestId, user.userId)
    if (!result.ok) {
      const status =
        result.reason === "request_not_found"
          ? 404
          : result.reason === "not_pending"
            ? 409
            : 403
      return NextResponse.json({ error: result.reason }, { status })
    }
    return NextResponse.json({
      ok: true,
      threadId: result.threadId,
      requestId: result.requestId,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
