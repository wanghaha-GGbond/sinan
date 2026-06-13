/**
 * M2 公益拍卖 — view layer.
 *
 * Per docs/05-spec-f4-auction.md §3, the auction page is "运营级, 表单级":
 * we just need a public read of the auction detail + a privacy-preserving
 * read of bid summaries (no bidder identity, no amount — only bid count).
 * The actual撮合 is offline.
 *
 * Anonymity rules (per 08 §2):
 *   - bid amount is never exposed until the auction is settled
 *   - bidder identity is never exposed (only段位 label, post-settle only)
 *   - host's段位 is exposed because the host is the publicly named
 *     person; their trustLevel is shown as a material cue, not a label
 */
import type { InferSelectModel } from "drizzle-orm"

import type { auctionBids, auctions } from "@/db/schema/auctions"

export type PublicAuction = {
  id: string
  hostDisplayName: string
  hostTrustLevel: number
  hostCompanyName: string | null
  scenarioTitle: string
  scenarioDesc: string
  durationMinutes: number
  guidePriceMinLabel: string
  guidePriceMaxLabel: string
  guidePriceMinCents: number
  guidePriceMaxCents: number
  charityFlag: boolean
  status: "draft" | "live" | "closed" | "settled" | "cancelled"
  startsAt: string
  endsAt: string
  bidCount: number
  createdAt: string
}

export type PublicBidSummary = {
  id: string
  bidderTrustLevel: number
  bidderJobBand: string | null
  isHeartPick: boolean
  status: "active" | "withdrawn" | "won" | "lost"
  // amount is intentionally omitted pre-settle (per spec §2.4)
  amountCents: number | null
  createdAt: string
}

export function formatPrice(cents: number): string {
  if (cents <= 0) return "面议"
  const yuan = Math.round(cents / 100)
  if (yuan >= 10000) return `${(yuan / 10000).toFixed(1)}万`
  if (yuan >= 1000) return `${(yuan / 1000).toFixed(1)}k`
  return `${yuan}元`
}

export function toPublicAuction(
  row: InferSelectModel<typeof auctions>,
  bidCount: number
): PublicAuction {
  return {
    id: row.id,
    hostDisplayName: row.hostDisplayName,
    hostTrustLevel: row.hostTrustLevel,
    hostCompanyName: row.hostCompanyName,
    scenarioTitle: row.scenarioTitle,
    scenarioDesc: row.scenarioDesc,
    durationMinutes: row.durationMinutes,
    guidePriceMinLabel: formatPrice(row.guidePriceMinCents),
    guidePriceMaxLabel: formatPrice(row.guidePriceMaxCents),
    guidePriceMinCents: row.guidePriceMinCents,
    guidePriceMaxCents: row.guidePriceMaxCents,
    charityFlag: row.charityFlag === 1,
    status: row.status,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    bidCount,
    createdAt: row.createdAt.toISOString(),
  }
}

export function toPublicBidSummary(
  row: InferSelectModel<typeof auctionBids>,
  isSettled: boolean
): PublicBidSummary {
  return {
    id: row.id,
    bidderTrustLevel: row.bidderTrustLevel,
    bidderJobBand: row.bidderJobBand,
    isHeartPick: row.isHeartPick === 1,
    status: row.status,
    amountCents: isSettled ? row.amountCents : null,
    createdAt: row.createdAt.toISOString(),
  }
}

export function isAuctionLive(auction: PublicAuction, now = new Date()): boolean {
  if (auction.status !== "live") return false
  const start = new Date(auction.startsAt).getTime()
  const end = new Date(auction.endsAt).getTime()
  const t = now.getTime()
  return t >= start && t < end
}

export function isAuctionEnded(auction: PublicAuction, now = new Date()): boolean {
  return new Date(auction.endsAt).getTime() < now.getTime()
}
