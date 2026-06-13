/**
 * M3 拍卖行情榜 — leaderboard 视图。
 *
 * Per docs/05-spec-f4-auction.md §2 "行情榜":
 *   - 按嘉宾维度展示历史成交价曲线
 *   - 成交价公开,出价人身份默认匿名(段位可见)
 *
 * 公开字段:
 *   - host:嘉宾公开身份(嘉宾本身就是公开的,不是 bidder)
 *   - scenario:场景标题
 *   - finalAmountCents:成交金额(公开)
 *   - settledAt:成交时间
 *   - isHeartPick:是否心动权成交
 *   - bidsCount:出价人数(只数,不显示金额/身份)
 *   - isCharity:是否全捐
 *
 * 不暴露任何 bidder 身份或 bid 金额明细。bidder 段位只在 bid summary 层
 * 出现过(auction-view.ts 的 toPublicBidSummary),行情榜完全不涉及 bid 维度的展示。
 */
import { and, desc, eq, sql } from "drizzle-orm"

import { auctionBids, auctions } from "@/db/schema/auctions"

export type LeaderboardItem = {
  auctionId: string
  host: {
    userId: string
    displayName: string
    trustLevel: number
    companyName: string | null
  }
  scenario: string
  finalAmountCents: number
  settledAt: string
  isHeartPick: boolean
  bidsCount: number
  isCharity: boolean
}

export type LeaderboardQuery = {
  hostId?: string
  limit?: number
  cursor?: string // auction.id of last item from previous page
}

export type LeaderboardPage = {
  items: LeaderboardItem[]
  nextCursor: string | null
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

/**
 * 取行情榜条目。仅 status='settled' 的专场进入榜。
 *
 * 分页:cursor = 上一页最后一条 auction.id,排序 settledAt DESC, id DESC
 * (id 作为复合键 tiebreaker,与 reviews 列表一致)。
 */
export async function getAuctionLeaderboard(
  query: LeaderboardQuery = {}
): Promise<LeaderboardPage> {
  const limit = Math.min(
    Math.max(1, Math.floor(query.limit ?? DEFAULT_LIMIT)),
    MAX_LIMIT
  )

  const { db } = await import("@/db/client")

  // 行情榜只取 settled
  const filters = [eq(auctions.status, "settled")]
  if (query.hostId) {
    filters.push(eq(auctions.hostUserId, query.hostId))
  }
  if (query.cursor) {
    // 分页断点:取 cursor 对应行的 (settledAt, id),然后用 < 复合比较。
    // 单条 SELECT 拿断点元数据,再合到主查询。
    const [cursorRow] = await db
      .select({
        settledAt: auctions.settledAt,
        id: auctions.id,
      })
      .from(auctions)
      .where(eq(auctions.id, query.cursor))
      .limit(1)
    if (!cursorRow || !cursorRow.settledAt) {
      return { items: [], nextCursor: null }
    }
    // (settledAt, id) < (cursorRow.settledAt, cursorRow.id)
    // 用 OR + AND 表达 tuple less-than:d.settledAt < cur.settledAt OR
    //   (d.settledAt = cur.settledAt AND d.id < cur.id)
    filters.push(
      sql`(${auctions.settledAt}, ${auctions.id}) < (${cursorRow.settledAt}, ${cursorRow.id})`
    )
  }

  const rows = await db
    .select({
      auction: auctions,
      bidsCount: sql<number>`count(${auctionBids.id})::int`,
    })
    .from(auctions)
    .leftJoin(
      auctionBids,
      and(
        eq(auctionBids.auctionId, auctions.id),
        // 只数 active + lost + won(bidsCount 是出价人数,撤回了不计)
        sql`${auctionBids.status} <> 'withdrawn'`
      )
    )
    .where(and(...filters))
    .groupBy(auctions.id)
    .orderBy(desc(auctions.settledAt), desc(auctions.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const sliced = hasMore ? rows.slice(0, limit) : rows
  const items: LeaderboardItem[] = sliced.map((row) => ({
    auctionId: row.auction.id,
    host: {
      userId: row.auction.hostUserId,
      displayName: row.auction.hostDisplayName,
      trustLevel: row.auction.hostTrustLevel,
      companyName: row.auction.hostCompanyName,
    },
    scenario: row.auction.scenarioTitle,
    finalAmountCents: row.auction.finalAmountCents ?? 0,
    settledAt:
      row.auction.settledAt?.toISOString() ??
      row.auction.updatedAt.toISOString(),
    isHeartPick:
      row.auction.settlementMethod === "heart_pick" ||
      // 兼容旧数据:若 settlementMethod 没写但 winnerBid 上 isHeartPick=1
      // 通过 join 推断
      false,
    bidsCount: Number(row.bidsCount ?? 0),
    isCharity: row.auction.charityFlag === 1,
  }))

  // 从 winnerBidId 二次查 isHeartPick:有些老数据 settlementMethod 字段缺失,
  // 以 winner bid 上的 isHeartPick=1 为准(单一事实源)。
  const winnerIds = rows
    .map((r) => r.auction.winnerBidId)
    .filter((id): id is string => !!id)
  if (winnerIds.length > 0) {
    const winners = await db
      .select({ id: auctionBids.id, isHeartPick: auctionBids.isHeartPick })
      .from(auctionBids)
      .where(sql`${auctionBids.id} IN (${sql.join(winnerIds.map((id) => sql`${id}`), sql`, `)})`)
    const heartPickSet = new Set(
      winners.filter((w) => w.isHeartPick === 1).map((w) => w.id)
    )
    for (const item of items) {
      const auction = rows.find((r) => r.auction.id === item.auctionId)!.auction
      if (auction.winnerBidId && heartPickSet.has(auction.winnerBidId)) {
        item.isHeartPick = true
      }
    }
  }

  return {
    items,
    nextCursor:
      hasMore && sliced.length > 0
        ? sliced[sliced.length - 1]!.auction.id
        : null,
  }
}