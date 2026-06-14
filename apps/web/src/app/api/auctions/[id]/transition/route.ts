/**
 * POST /api/auctions/[id]/transition
 *
 * 拍卖状态机迁移(运营/moderator+)。规则:
 *   - moderator / admin 才能调
 *   - reason 强制非空(运营审计)
 *   - 状态机:见 lib/server/auction-engine.ts (draft→live→closed→settled + 任意→cancelled)
 */
import { NextRequest, NextResponse } from "next/server"

import {
  AuctionEngineError,
  type AuctionStatus,
  transitionAuction,
} from "@/lib/server/auction-engine"
import { requireModerator } from "@/lib/server/auth"

const ALLOWED_TO: AuctionStatus[] = ["live", "closed", "settled", "cancelled"]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let actor
  try {
    actor = await requireModerator()
  } catch (resp) {
    return resp as Response
  }

  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const to = String(body.to ?? "") as AuctionStatus
  const reason = String(body.reason ?? "").trim()

  if (!ALLOWED_TO.includes(to)) {
    return NextResponse.json(
      { error: `to 必须是 ${ALLOWED_TO.join("/")} 之一` },
      { status: 400 }
    )
  }

  try {
    const result = await transitionAuction(id, to, reason)
    return NextResponse.json({ ok: true, ...result, actorUserId: actor.userId })
  } catch (e: unknown) {
    if (e instanceof AuctionEngineError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.status }
      )
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}