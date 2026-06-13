/**
 * POST /api/circles/[id]/revoke — 撤销成员资格.
 *
 * Per docs/04-spec-f3-growth.md §2:
 *   - moderator / admin: 任何成员都可撤
 *   - 普通用户 (endorser): 只能撤自己背书的成员
 *   - 撤销需填理由
 */
import { NextRequest, NextResponse } from "next/server"

import { getAuthUser } from "@/lib/server/auth"
import { revokeMembership } from "@/lib/server/circles"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  const { id: _circleId } = await params
  void _circleId
  let body: { memberId?: string; reason?: string }
  try {
    body = (await request.json()) as { memberId?: string; reason?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const memberId = String(body.memberId ?? "").trim()
  const reason = String(body.reason ?? "").trim()
  if (!memberId) {
    return NextResponse.json({ error: "Missing memberId" }, { status: 400 })
  }
  if (!reason) {
    return NextResponse.json({ error: "需要撤销理由" }, { status: 400 })
  }

  try {
    const result = await revokeMembership(
      memberId,
      { userId: user.userId, role: user.role },
      reason
    )
    if (!result.ok) {
      if (result.reason === "membership_not_found") {
        return NextResponse.json({ error: "成员记录不存在" }, { status: 404 })
      }
      return NextResponse.json({ error: "无权撤销该成员" }, { status: 403 })
    }
    return NextResponse.json({ ok: true, membershipId: result.membershipId })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
