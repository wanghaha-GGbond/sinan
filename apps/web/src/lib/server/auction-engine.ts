/**
 * M3 拍卖功能化 — 状态机 + 心动权 + 默认最高价成交
 *
 * Per docs/05-spec-f4-auction.md §4:
 *   - draft → live → closed → settled (运营选标 / 嘉宾心动权 / 默认最高价)
 *   - 任意 → cancelled (运营取消)
 *   - heart_pick 行使后,该场其它 active bids 全变 'lost',auctions.winnerBidId +
 *     finalAmountCents 写入
 *   - settleByHighestBid:嘉宾未行使心动权时,默认最高价成交
 *   - 心跳权与默认成交互斥:settled 状态再调会抛错
 *   - 全部操作事务化,失败回滚
 *
 * §5 硬前置未闭环(支付通道 / 个税代扣 / 经营性 ICP) — 平台不碰钱,
 *   所以这一步只做状态变更 + 中标 bid 标记,不入资金账。
 *
 * 实现要点:
 *   - 用 PG native 事务(db.transaction)保证原子性
 *   - 不在 service 层做权限校验 — 由调用路由负责(hostUserId/moderator)
 *   - settleByHighestBid 取 active bids 中 amount 最高的;
 *     同价取 createdAt 最早的(spec §2 "同价先出者得")
 */
import { and, asc, desc, eq, sql } from "drizzle-orm"

import { auctionBids, auctions } from "@/db/schema/auctions"

export type AuctionStatus =
  | "draft"
  | "live"
  | "closed"
  | "settled"
  | "cancelled"

export type SettlementMethod = "heart_pick" | "highest_bid"

export class AuctionEngineError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, message: string, status = 409) {
    super(message)
    this.code = code
    this.status = status
  }
}

const VALID_TRANSITIONS: Record<AuctionStatus, AuctionStatus[]> = {
  draft: ["live", "cancelled"],
  live: ["closed", "cancelled"],
  closed: ["settled", "cancelled"],
  settled: [],
  cancelled: [],
}

export function canTransition(
  from: AuctionStatus,
  to: AuctionStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * 拍卖状态机迁移。
 *
 * @param reason 必填字段(closed/settled/cancelled 时强制),运营审计用。
 *               draft → live 不强制(运营开拍本身可以理解为无理由)。
 *               但为了让 04/08 审计能追溯,这里全部强制非空 reason。
 */
export async function transitionAuction(
  id: string,
  to: AuctionStatus,
  reason: string
): Promise<{ id: string; status: AuctionStatus }> {
  const trimmedReason = String(reason ?? "").trim()
  if (!trimmedReason) {
    throw new AuctionEngineError(
      "reason_required",
      "状态变更必须填写原因(reason 必填,审计追溯)",
      400
    )
  }

  const { db } = await import("@/db/client")

  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(auctions)
      .where(eq(auctions.id, id))
      .for("update")
    if (!row) {
      throw new AuctionEngineError("not_found", "专场不存在", 404)
    }
    if (!canTransition(row.status, to)) {
      throw new AuctionEngineError(
        "invalid_transition",
        `非法状态迁移: ${row.status} → ${to}`,
        409
      )
    }

    const now = new Date()
    const patch: Partial<typeof auctions.$inferInsert> = {
      status: to,
      updatedAt: now,
    }
    if (to === "closed") {
      patch.closedAt = now
    } else if (to === "cancelled") {
      patch.cancelledAt = now
      patch.cancelReason = trimmedReason
    } else if (to === "settled") {
      // 注意:settled 路径只能由 settleByHighestBid / exerciseHeartPick
      // 写入 finalAmountCents + winnerBidId + settledAt,这里不允许直跳。
      // 但保留 transitionAuction 的 closed→settled 用作运营手动"标记成交"
      // 的兜底(不传 winnerBidId),不带 finalAmount,audit only。
      patch.settledAt = now
    }

    await tx.update(auctions).set(patch).where(eq(auctions.id, id))
    return { id, status: to }
  })
}

/**
 * 嘉宾行使心动权:从全部 active bids 中指定一个为 winner。
 *
 * 前置条件:
 *   - auction.status === 'closed'(必须先截拍)
 *   - bid.status === 'active' && bid.auctionId === auctionId
 *   - bids 数量 > 0
 *
 * 副作用:
 *   - 该 bid:status='won', isHeartPick=1
 *   - 其它 active bids(同 auction):status='lost'
 *   - auction:status='settled', winnerBidId=bidId, finalAmountCents=bid.amount,
 *     settlementMethod='heart_pick', settledAt=now, settledByUserId=actorUserId
 *
 * 互斥:auction 已 settled → 抛错(防止 double-settle)
 */
export async function exerciseHeartPick(
  auctionId: string,
  bidId: string,
  actorUserId: string
): Promise<{
  auctionId: string
  winnerBidId: string
  finalAmountCents: number
  settlementMethod: "heart_pick"
}> {
  const { db } = await import("@/db/client")

  return db.transaction(async (tx) => {
    const [auction] = await tx
      .select()
      .from(auctions)
      .where(eq(auctions.id, auctionId))
      .for("update")
    if (!auction) {
      throw new AuctionEngineError("not_found", "专场不存在", 404)
    }
    if (auction.status === "settled") {
      throw new AuctionEngineError(
        "already_settled",
        "该专场已成交,不能再行使心动权",
        409
      )
    }
    if (auction.status !== "closed") {
      throw new AuctionEngineError(
        "not_closed",
        "该专场尚未截拍,不能行使心动权",
        409
      )
    }

    const [bid] = await tx
      .select()
      .from(auctionBids)
      .where(and(eq(auctionBids.id, bidId), eq(auctionBids.auctionId, auctionId)))
      .for("update")
    if (!bid) {
      throw new AuctionEngineError("bid_not_found", "出价记录不存在", 404)
    }
    if (bid.status !== "active") {
      throw new AuctionEngineError(
        "bid_not_active",
        `该出价状态为 ${bid.status},不能选为心动权`,
        409
      )
    }

    // 1. 中标 bid → won + isHeartPick=1
    await tx
      .update(auctionBids)
      .set({ status: "won", isHeartPick: 1 })
      .where(eq(auctionBids.id, bidId))

    // 2. 其它 active bids(同 auction)→ lost
    await tx
      .update(auctionBids)
      .set({ status: "lost" })
      .where(
        and(
          eq(auctionBids.auctionId, auctionId),
          eq(auctionBids.status, "active"),
          sql`${auctionBids.id} <> ${bidId}`
        )
      )

    // 3. auction → settled + winnerBidId + finalAmountCents + settlementMethod
    const now = new Date()
    await tx
      .update(auctions)
      .set({
        status: "settled",
        winnerBidId: bidId,
        finalAmountCents: bid.amountCents,
        settlementMethod: "heart_pick",
        settledAt: now,
        settledByUserId: actorUserId,
        updatedAt: now,
      })
      .where(eq(auctions.id, auctionId))

    return {
      auctionId,
      winnerBidId: bidId,
      finalAmountCents: bid.amountCents,
      settlementMethod: "heart_pick" as const,
    }
  })
}

/**
 * 默认最高价成交。嘉宾未行使心动权时由嘉宾主动确认或系统超时后触发。
 *
 * 选择规则(spec §2.4 "同价先出者得"):
 *   - active bids 中 amountCents 最大者
 *   - 同价取 createdAt 最早
 *
 * 副作用:
 *   - 胜出 bid:status='won'(其它 active → 'lost')
 *   - auction:status='settled', winnerBidId, finalAmountCents,
 *     settlementMethod='highest_bid', settledAt=now, settledByUserId=actorUserId
 *
 * 互斥:auction 已 settled → 抛错
 *
 * 边界:
 *   - 如果 active bids 为 0,auction 仍可 settled 但 winnerBidId=null,
 *     finalAmountCents=0,settlementMethod='highest_bid'(流拍但状态机闭合)
 */
export async function settleByHighestBid(
  auctionId: string,
  actorUserId: string
): Promise<{
  auctionId: string
  winnerBidId: string | null
  finalAmountCents: number
  settlementMethod: "highest_bid"
}> {
  const { db } = await import("@/db/client")

  return db.transaction(async (tx) => {
    const [auction] = await tx
      .select()
      .from(auctions)
      .where(eq(auctions.id, auctionId))
      .for("update")
    if (!auction) {
      throw new AuctionEngineError("not_found", "专场不存在", 404)
    }
    if (auction.status === "settled") {
      throw new AuctionEngineError(
        "already_settled",
        "该专场已成交,不能再默认成交",
        409
      )
    }
    if (auction.status !== "closed") {
      throw new AuctionEngineError(
        "not_closed",
        "该专场尚未截拍,不能默认成交",
        409
      )
    }

    // 取 active bids,按 amount DESC + createdAt ASC(spec §2.4 同价先出)
    const candidates = await tx
      .select()
      .from(auctionBids)
      .where(
        and(
          eq(auctionBids.auctionId, auctionId),
          eq(auctionBids.status, "active")
        )
      )
      .orderBy(desc(auctionBids.amountCents), asc(auctionBids.createdAt))
      .for("update")

    const winner = candidates[0] ?? null

    if (winner) {
      await tx
        .update(auctionBids)
        .set({ status: "won", isHeartPick: 0 })
        .where(eq(auctionBids.id, winner.id))

      await tx
        .update(auctionBids)
        .set({ status: "lost" })
        .where(
          and(
            eq(auctionBids.auctionId, auctionId),
            eq(auctionBids.status, "active"),
            sql`${auctionBids.id} <> ${winner.id}`
          )
        )
    }

    const now = new Date()
    await tx
      .update(auctions)
      .set({
        status: "settled",
        winnerBidId: winner?.id ?? null,
        finalAmountCents: winner?.amountCents ?? 0,
        settlementMethod: "highest_bid",
        settledAt: now,
        settledByUserId: actorUserId,
        updatedAt: now,
      })
      .where(eq(auctions.id, auctionId))

    return {
      auctionId,
      winnerBidId: winner?.id ?? null,
      finalAmountCents: winner?.amountCents ?? 0,
      settlementMethod: "highest_bid" as const,
    }
  })
}

/**
 * 撤回出价 — bidder 主动撤回。
 *
 * 规则:
 *   - bid 必须属于 caller(权限校验由路由层做,此处只校验状态)
 *   - bid.status 必须为 'active'(已 won/lost/withdrawn 不能改)
 *   - auction.status 不限制:即使已 settled,也不允许改历史 bid 状态(防回滚)
 *
 * 返回:更新后的 bid
 */
export async function withdrawBid(
  bidId: string,
  callerUserId: string
): Promise<{ bidId: string; status: "withdrawn" }> {
  const { db } = await import("@/db/client")

  return db.transaction(async (tx) => {
    const [bid] = await tx
      .select()
      .from(auctionBids)
      .where(eq(auctionBids.id, bidId))
      .for("update")
    if (!bid) {
      throw new AuctionEngineError("bid_not_found", "出价记录不存在", 404)
    }
    if (bid.bidderUserId !== callerUserId) {
      throw new AuctionEngineError(
        "not_owner",
        "只能撤回自己的出价",
        403
      )
    }
    if (bid.status !== "active") {
      throw new AuctionEngineError(
        "bid_not_active",
        `该出价状态为 ${bid.status},不能撤回`,
        409
      )
    }
    await tx
      .update(auctionBids)
      .set({ status: "withdrawn" })
      .where(eq(auctionBids.id, bidId))
    return { bidId, status: "withdrawn" as const }
  })
}