/**
 * POST /api/auctions/[id]/settle-default
 *
 * 嘉宾未行使心动权时,默认最高价成交。仅 hostUserId 可调。
 */
import { NextRequest, NextResponse } from "next/server"

import {
  AuctionEngineError,
  settleByHighestBid,
} from "@/lib/server/auction-engine"
import { eq } from "drizzle-orm"

import { auctions } from "@/db/schema/auctions"
import { requireAuthUser } from "@/lib/server/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let actor
  try {
    actor = await requireAuthUser()
  } catch (resp) {
    return resp as Response
  }

  const { id: auctionId } = await params

  try {
    const { db } = await import("@/db/client")
    const [auction] = await db
      .select({ hostUserId: auctions.hostUserId })
      .from(auctions)
      .where(eq(auctions.id, auctionId))
      .limit(1)
    if (!auction) {
      return NextResponse.json({ error: "专场不存在" }, { status: 404 })
    }
    if (auction.hostUserId !== actor.userId) {
      return NextResponse.json(
        { error: "只有嘉宾本人能确认默认成交" },
        { status: 403 }
      )
    }

    const result = await settleByHighestBid(auctionId, actor.userId)
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