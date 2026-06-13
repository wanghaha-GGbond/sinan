/**
 * POST /api/auctions/[id]/bids — submit a blind bid.
 *
 * Spec rules enforced here:
 *   - bidder must be logged in (L0+ trustLevel), read from auth cookie
 *   - bidder must be trustLevel >= 1 to be allowed to bid (per host
 *     eligibility mirror — non-verified accounts would pollute the
 *     auction's段位 signal)
 *   - amount is integer cents, must be within guide price range
 *   - reasonText capped at 200 chars (spec §2.2)
 *   - one bid per (auction, bidder) — second submit overwrites via
 *     unique index (idempotent retry of a network-flaky client)
 *   - auction must be live AND within the [startsAt, endsAt) window
 *
 * Side effect: increments bidCount via the unique index, not via an
 * explicit counter (counts are derived in the list endpoint with
 * COUNT()).
 */
import { NextRequest, NextResponse } from "next/server"

import { auctionBids, auctions } from "@/db/schema/auctions"
import { getAuthUser } from "@/lib/server/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  const { id: auctionId } = await params
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const amountCents = Math.round(Number(body.amountCents ?? 0))
  const reasonText = String(body.reasonText ?? "").trim()
  if (!Number.isFinite(amountCents) || amountCents < 100) {
    return NextResponse.json({ error: "出价至少 1 元" }, { status: 400 })
  }
  if (reasonText.length < 10 || reasonText.length > 200) {
    return NextResponse.json(
      { error: "「为什么是我」需 10-200 字" },
      { status: 400 }
    )
  }

  try {
    const { db } = await import("@/db/client")

    // AuthUser only carries userId + role; we need trustLevel + jobBand
    // for the bid record (and to enforce the L1 floor).
    const { users } = await import("@/db/schema/users")
    const { eq } = await import("drizzle-orm")
    const [bidder] = await db
      .select({
        id: users.id,
        trustLevel: users.trustLevel,
        jobBand: users.jobBand,
      })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1)
    if (!bidder) {
      return NextResponse.json({ error: "账号不存在" }, { status: 401 })
    }
    if (bidder.trustLevel < 1) {
      return NextResponse.json(
        { error: "完成邮箱验证后即可出价" },
        { status: 403 }
      )
    }

    const [auction] = await db
      .select()
      .from(auctions)
      .where(eq(auctions.id, auctionId))
      .limit(1)
    if (!auction) {
      return NextResponse.json({ error: "专场不存在" }, { status: 404 })
    }
    if (auction.status !== "live") {
      return NextResponse.json({ error: "该专场未在竞拍中" }, { status: 409 })
    }
    const now = new Date()
    if (now < auction.startsAt || now >= auction.endsAt) {
      return NextResponse.json({ error: "该专场未在竞拍中" }, { status: 409 })
    }
    if (
      amountCents < auction.guidePriceMinCents ||
      amountCents > auction.guidePriceMaxCents
    ) {
      return NextResponse.json(
        { error: `出价需在 ${auction.guidePriceMinCents / 100}-${auction.guidePriceMaxCents / 100} 元之间` },
        { status: 400 }
      )
    }
    if (auction.hostUserId === bidder.id) {
      return NextResponse.json(
        { error: "嘉宾不能为自己的专场出价" },
        { status: 409 }
      )
    }

    // Upsert: same bidder retrying updates the existing row in-place,
    // which is the natural "改主意" UX. The unique index
    // (auctionId, bidderUserId) makes this safe.
    const inserted = await db
      .insert(auctionBids)
      .values({
        auctionId,
        bidderUserId: bidder.id,
        bidderTrustLevel: bidder.trustLevel,
        bidderJobBand: bidder.jobBand,
        amountCents,
        reasonText,
        status: "active",
      })
      .onConflictDoUpdate({
        target: [auctionBids.auctionId, auctionBids.bidderUserId],
        set: {
          amountCents,
          reasonText,
          // keep prior status; don't accidentally re-activate a withdrawn bid
        },
      })
      .returning()

    return NextResponse.json(
      { ok: true, bidId: inserted[0]?.id ?? null },
      { status: 201 }
    )
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
