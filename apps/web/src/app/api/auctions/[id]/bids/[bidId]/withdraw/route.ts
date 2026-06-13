/**
 * POST /api/auctions/[id]/bids/[bidId]/withdraw
 *
 * 撤回出价。仅 bidderUserId 可调。
 */
import { NextRequest, NextResponse } from "next/server"

import { AuctionEngineError, withdrawBid } from "@/lib/server/auction-engine"
import { requireAuthUser } from "@/lib/server/auth"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string }> }
) {
  let actor
  try {
    actor = await requireAuthUser()
  } catch (resp) {
    return resp as Response
  }

  const { bidId } = await params

  try {
    const result = await withdrawBid(bidId, actor.userId)
    return NextResponse.json({ ok: true, ...result })
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