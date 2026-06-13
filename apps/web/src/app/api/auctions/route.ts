/**
 * GET /api/auctions — list all live + recently settled auctions
 *
 * Per spec §3: the page is the only public-facing surface for M2. Returns
 * public summaries (no bidder amounts/identities). Bid count is included
 * to keep the "紧张感" (spec §2.2) of seeing participation grow.
 */
import { NextResponse } from "next/server"
import { desc, eq, sql } from "drizzle-orm"

import { auctionBids, auctions } from "@/db/schema/auctions"
import {
  isAuctionEnded,
  toPublicAuction,
} from "@/lib/server/auction-view"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { db } = await import("@/db/client")

    // Pull the last 30 auctions, anything not cancelled. We want live +
    // recent settled so the page can show "进行中" and "已落槌" sections
    // without a second round-trip.
    const rows = await db
      .select({
        auction: auctions,
        bidCount: sql<number>`count(${auctionBids.id})::int`,
      })
      .from(auctions)
      .leftJoin(auctionBids, eq(auctionBids.auctionId, auctions.id))
      .where(sql`${auctions.status} <> 'cancelled'`)
      .groupBy(auctions.id)
      .orderBy(desc(auctions.startsAt))
      .limit(30)

    const now = new Date()
    const items = rows.map((row) => {
      const pub = toPublicAuction(row.auction, Number(row.bidCount ?? 0))
      return {
        ...pub,
        isLive: pub.status === "live" && !isAuctionEnded(pub, now),
        isEnded: isAuctionEnded(pub, now),
      }
    })

    return NextResponse.json({ auctions: items })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
