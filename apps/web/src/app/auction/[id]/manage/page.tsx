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

import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"
import { auctionBids, auctions } from "@/db/schema/auctions"
import { and, desc, eq } from "drizzle-orm"

import { getAuthUser } from "@/lib/server/auth"
import { formatPrice } from "@/lib/server/auction-view"
import { ClosedManageClient } from "@/components/auction/manage-actions"

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
        <ClosedManageClient auctionId={auction.id} bids={bids.map(b => ({ ...b, createdAt: b.createdAt.toISOString() }))} />
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

function DraftManage({ auctionId: _ }: { auctionId: string }) {
  return (
    <SolidCard variant="subtle" className="p-6">
      <h2 className="text-base font-semibold">专场准备就绪</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        draft 状态下由运营 moderator 触发开拍。开拍后即进入 72 小时盲拍竞拍。
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        请联系运营人员开拍，嘉宾本人无权直接触发状态迁移。
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