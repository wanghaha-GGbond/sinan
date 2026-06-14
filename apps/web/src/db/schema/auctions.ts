/**
 * M2 公益拍卖专场 — 简表 (auction + auction_bids)。
 *
 * Per docs/05-spec-f4-auction.md §3: M2 runs "运营级" auctions — no
 * bidding engine, no payment channel, all income donated. This table
 * is the bare minimum we need to:
 *   - publish a public auction page (静态专场页)
 *   - collect bid intents (出价 + "为什么是我")
 *   - export to the operator who manually撮合 / 通知 / 收款
 *
 * Schema decisions:
 *   - PostgreSQL ENUMs for status to keep state machine explicit
 *   - reason_text capped at 200 chars (spec §2.2)
 *   - amount stored as integer cents to avoid float drift on bidding
 *   - bid.anonymousBidderId is optional; if null, only段位 is exposed
 *     (per spec §2.4 — bidders stay anonymous by default)
 *   - winnerBidId + closedAt + finalAmount filled manually by the
 *     operator after off-platform撮合; the route exposes a small
 *     admin endpoint for that
 */
import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { users } from "./users"

export const auctionStatusEnum = pgEnum("auction_status", [
  "draft",
  "live",
  "closed",
  "settled",
  "cancelled",
])

export const bidStatusEnum = pgEnum("bid_status", [
  "active",
  "withdrawn",
  "won",
  "lost",
])

export const auctions = pgTable(
  "auctions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    hostUserId: uuid("host_user_id").notNull().references(() => users.id),
    hostDisplayName: text("host_display_name").notNull(),
    hostTrustLevel: integer("host_trust_level").notNull(),
    hostCompanyName: text("host_company_name"),
    scenarioTitle: text("scenario_title").notNull(),
    scenarioDesc: text("scenario_desc").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    guidePriceMinCents: integer("guide_price_min_cents").notNull(),
    guidePriceMaxCents: integer("guide_price_max_cents").notNull(),
    charityFlag: integer("charity_flag").default(1).notNull(),
    status: auctionStatusEnum("status").default("draft").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    finalAmountCents: integer("final_amount_cents"),
    winnerBidId: uuid("winner_bid_id"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    // "heart_pick" | "highest_bid" | null (un-settled or cancelled)
    settlementMethod: text("settlement_method"),
    // settlement actor: moderator userId or hostUserId — useful for
    // audit + leaderboard aggregation by host performance later.
    settledByUserId: uuid("settled_by_user_id"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("auctions_status_starts_at_idx").on(table.status, table.startsAt),
    index("auctions_host_idx").on(table.hostUserId),
  ]
)

export const auctionBids = pgTable(
  "auction_bids",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    auctionId: uuid("auction_id")
      .notNull()
      .references(() => auctions.id, { onDelete: "cascade" }),
    bidderUserId: uuid("bidder_user_id")
      .notNull()
      .references(() => users.id),
    bidderTrustLevel: integer("bidder_trust_level").notNull(),
    bidderJobBand: text("bidder_job_band"),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    reasonText: text("reason_text").notNull(),
    status: bidStatusEnum("status").default("active").notNull(),
    isHeartPick: integer("is_heart_pick").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("auction_bids_auction_bidder_unique").on(table.auctionId, table.bidderUserId),
    index("auction_bids_status_idx").on(table.status),
  ]
)
