/**
 * POST /api/circles/[id]/join — 申请入圈, 需登录 + L1+, 由 1 名 active 成员
 * 背书。
 *
 * Per docs/04-spec-f3-growth.md §2:
 *   - 1 名现有成员背书 (endorsedByUserId)
 *   - 背书人 trustLevel >= circle.minTrustLevel
 *   - 不允许自我背书
 *   - 申请人 trustLevel >= circle.minTrustLevel
 */
import { NextRequest, NextResponse } from "next/server"

import { getAuthUser } from "@/lib/server/auth"
import { joinCircle } from "@/lib/server/circles"
import { checkRateLimit, getRateLimitKey } from "@/lib/server/rate-limit"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  const rl = checkRateLimit(getRateLimitKey(request, "circles.join"), {
    maxRequests: 10,
    windowSeconds: 60,
  })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "操作过于频繁, 请稍后再试" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }

  const { id: circleId } = await params
  if (!circleId) {
    return NextResponse.json({ error: "Missing circle id" }, { status: 400 })
  }

  let body: { endorsedByUserId?: string }
  try {
    body = (await request.json()) as { endorsedByUserId?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const endorsedByUserId = String(body.endorsedByUserId ?? "").trim()
  if (!endorsedByUserId) {
    return NextResponse.json(
      { error: "需要 1 名现有成员背书" },
      { status: 400 }
    )
  }

  try {
    const result = await joinCircle(circleId, user.userId, endorsedByUserId)
    if (!result.ok) {
      const reasonMessages: Record<typeof result.reason, string> = {
        circle_not_found: "圈层不存在",
        circle_archived: "圈层已归档",
        user_already_member: "你已是该圈层成员",
        self_endorsement_not_allowed: "不能自我背书",
        endorser_not_member: "背书人不是该圈层成员",
        endorser_trust_too_low: "背书人段位不足",
        user_not_found: "账号不存在",
        applicant_trust_too_low: "你的段位未达到入圈门槛",
      }
      const status = result.reason === "circle_not_found" ? 404 : 400
      return NextResponse.json(
        { error: reasonMessages[result.reason] ?? result.reason },
        { status }
      )
    }
    return NextResponse.json(
      { ok: true, membershipId: result.membershipId },
      { status: 201 }
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
