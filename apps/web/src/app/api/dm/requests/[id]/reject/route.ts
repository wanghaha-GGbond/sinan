/**
 * POST /api/dm/requests/[id]/reject — 接收方拒绝, 标 rejected.
 */
import { NextRequest, NextResponse } from "next/server"

import { getAuthUser } from "@/lib/server/auth"
import { rejectRequest } from "@/lib/server/dm-engine"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
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
  let body: { reason?: string } = {}
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      body = (await request.json()) as { reason?: string }
    }
  } catch {
    body = {}
  }
  try {
    const result = await rejectRequest(requestId, user.userId, body.reason)
    if (!result.ok) {
      const status =
        result.reason === "request_not_found"
          ? 404
          : result.reason === "not_pending"
            ? 409
            : 403
      return NextResponse.json({ error: result.reason }, { status })
    }
    return NextResponse.json({ ok: true, requestId: result.requestId })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
