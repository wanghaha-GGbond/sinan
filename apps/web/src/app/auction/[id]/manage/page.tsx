/**
 * /auction/[id]/manage — 嘉宾管理页(嘉宾身份登录后可见)
 *
 * 规则:
 *   - auth gate: 必须登录;actor.userId === auction.hostUserId 或 moderator/admin
 *   - draft:显示"开拍"按钮(走 /api/auctions/[id]/transition to='live',需 moderator)
 *   - closed:显示"行使心动权"(从 bids 列表选) + "默认最高价"
 *   - settled / cancelled:只读
 *
 * 匿名规则(08 §2):bids 列表只显示段位 + 「为什么是我」截断前 60 字,
 *   不显示 bid amount pre-settle(对嘉宾可见是对内数据,公开页一律 hide)。
 *   这里因有 auth gate,bid amount 仅对 host/moderator 暴露,符合 08 §2.4。
 */
import Link from "next/link"
import { redirect } from "next/navigation"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"
import { auctionBids, auctions } from "@/db/schema/auctions"
import { and, desc, eq } from "drizzle-orm"

import { getAuthUser } from "@/lib/server/auth"
import { formatPrice } from "@/lib/server/auction-view"

export const dynamic = "force-dynamic"

type ManageAuction = {
  id: string
  hostUserId: string
  hostDisplayName: string
  scenarioTitle: string
  status: "draft" | "live" | "closed" | "settled" | "cancelled"
  finalAmountCents: number | null
  settlementMethod: string | null
}

type LoadResult =
  | { kind: "ok"; auction: ManageAuction }
  | { kind: "not_found" }
  | { kind: "db_unavailable" }

async function loadAuction(id: string): Promise<LoadResult> {
  try {
    const { db } = await import("@/db/client")
    const [row] = await db
      .select()
      .from(auctions)
      .where(eq(auctions.id, id))
      .limit(1)
    if (!row) return { kind: "not_found" }
    return { kind: "ok", auction: row as ManageAuction }
  } catch (e) {
    if (
      e instanceof Error &&
      (e.message.includes("DATABASE_URL") ||
        e.message.includes("db_unavailable"))
    ) {
      return { kind: "db_unavailable" }
    }
    return { kind: "not_found" }
  }
}

async function loadBids(id: string) {
  try {
    const { db } = await import("@/db/client")
    const rows = await db
      .select({
        id: auctionBids.id,
        bidderTrustLevel: auctionBids.bidderTrustLevel,
        bidderJobBand: auctionBids.bidderJobBand,
        amountCents: auctionBids.amountCents,
        reasonText: auctionBids.reasonText,
        status: auctionBids.status,
        createdAt: auctionBids.createdAt,
      })
      .from(auctionBids)
      .where(
        and(
          eq(auctionBids.auctionId, id),
          eq(auctionBids.status, "active")
        )
      )
      .orderBy(desc(auctionBids.amountCents))
    return rows
  } catch {
    return []
  }
}

export default async function AuctionManagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // auth gate 必须在 DB 查询前,避免未授权用户触发 loadAuction
  const user = await getAuthUser()
  if (!user) redirect(`/login?next=/auction/${id}/manage`)

  const data = await loadAuction(id)
  if (data.kind === "not_found") {
    return (
      <section className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-8 sm:px-6">
        <SolidCard variant="elevated" className="p-6">
          <h1 className="text-2xl font-semibold">专场不存在</h1>
        </SolidCard>
      </section>
    )
  }
  if (data.kind === "db_unavailable") {
    return (
      <section className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-8 sm:px-6">
        <SolidCard variant="elevated" className="p-6">
          <h1 className="text-2xl font-semibold">数据库暂时不可用</h1>
          <p className="mt-2 text-sm text-muted-foreground">稍后再试。</p>
        </SolidCard>
      </section>
    )
  }
  const auction = data.auction

  // 只有 host 本人 / moderator / admin 能进管理页
  const isHost = user.userId === auction.hostUserId
  const isPrivileged = user.role === "moderator" || user.role === "admin"
  if (!isHost && !isPrivileged) {
    redirect(`/auction/${id}`)
  }

  const bids = auction.status === "closed" ? await loadBids(id) : []

  return (
    <section className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-8 sm:px-6">
      <SolidCard variant="elevated" className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              嘉宾管理
            </div>
            <h1 className="mt-1 text-2xl font-semibold">
              {auction.scenarioTitle}
            </h1>
          </div>
          <TagPill tone="neutral">{auction.status}</TagPill>
        </div>
      </SolidCard>

      {auction.status === "draft" ? (
        <DraftManage auctionId={auction.id} />
      ) : auction.status === "live" ? (
        <LiveManage />
      ) : auction.status === "closed" ? (
        <ClosedManage auctionId={auction.id} bids={bids} />
      ) : auction.status === "settled" ? (
        <SettledManage auction={auction} />
      ) : (
        <CancelledManage />
      )}

      <div className="text-xs">
        <Link href={`/auction/${auction.id}`} className="underline">
          ← 返回详情页
        </Link>
      </div>
    </section>
  )
}

function DraftManage({ auctionId }: { auctionId: string }) {
  return (
    <SolidCard variant="subtle" className="p-6">
      <h2 className="text-base font-semibold">专场准备就绪</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        draft 状态下可由运营开拍。开拍后即进入 72 小时盲拍竞拍。
      </p>
      <div className="mt-4">
        <form
          action={`/api/auctions/${auctionId}/transition`}
          method="post"
        >
          <input type="hidden" name="to" value="live" />
          <input
            type="hidden"
            name="reason"
            value="嘉宾在管理页确认开拍"
          />
          <SolidButton type="submit" variant="primary" size="sm">
            开拍
          </SolidButton>
        </form>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        注:实际开拍由 moderator 触发;嘉宾本人点击会通过服务端鉴权被拒。
      </p>
    </SolidCard>
  )
}

function LiveManage() {
  return (
    <SolidCard variant="subtle" className="p-6">
      <h2 className="text-base font-semibold">专场进行中</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        当前正在盲拍,嘉宾暂不能干预。截拍后会回到本页选标。
      </p>
    </SolidCard>
  )
}

function ClosedManage({
  auctionId,
  bids,
}: {
  auctionId: string
  bids: Array<{
    id: string
    bidderTrustLevel: number
    bidderJobBand: string | null
    reasonText: string
    amountCents: number
    status: string
    createdAt: Date
  }>
}) {
  return (
    <>
      <SolidCard variant="elevated" className="p-6">
        <h2 className="text-base font-semibold">选标</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          截拍后 72 小时内行使心动权,或选择默认最高价成交。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <form
            action={`/api/auctions/${auctionId}/settle-default`}
            method="post"
          >
            <SolidButton type="submit" variant="primary" size="sm">
              默认最高价成交
            </SolidButton>
          </form>
        </div>
      </SolidCard>

      <SolidCard variant="subtle" className="p-6">
        <h3 className="text-base font-semibold">候选出价(共 {bids.length} 条)</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          每条候选的金额仅嘉宾本人可见(用于排序);公开页面只显示段位和「为什么是我」。
        </p>
        <ul className="mt-4 space-y-3">
          {bids.map((bid) => (
            <li
              key={bid.id}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>L{bid.bidderTrustLevel}</span>
                  {bid.bidderJobBand ? (
                    <span>· {bid.bidderJobBand}</span>
                  ) : null}
                  <span className="ml-2 text-foreground">
                    {formatPrice(bid.amountCents)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground">
                  {bid.reasonText.slice(0, 60)}
                  {bid.reasonText.length > 60 ? "…" : ""}
                </p>
              </div>
              <form
                action={`/api/auctions/${auctionId}/heart-pick`}
                method="post"
              >
                <input type="hidden" name="bidId" value={bid.id} />
                <SolidButton type="submit" variant="secondary" size="sm">
                  行使心动权
                </SolidButton>
              </form>
            </li>
          ))}
          {bids.length === 0 ? (
            <li className="text-sm text-muted-foreground">
              暂无 active bids,可直接走默认最高价(将流拍)。
            </li>
          ) : null}
        </ul>
      </SolidCard>
    </>
  )
}

function SettledManage({ auction }: { auction: ManageAuction }) {
  return (
    <SolidCard variant="subtle" className="p-6">
      <h2 className="text-base font-semibold">已成交</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {auction.settlementMethod === "heart_pick"
          ? "心动权由嘉宾行使"
          : "默认最高价成交"}
        ,成交金额 {formatPrice(auction.finalAmountCents ?? 0)}。
      </p>
    </SolidCard>
  )
}

function CancelledManage() {
  return (
    <SolidCard variant="subtle" className="p-6">
      <h2 className="text-base font-semibold">已取消</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        本场已被运营取消,不再可成交。
      </p>
    </SolidCard>
  )
}