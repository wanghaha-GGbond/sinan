/**
 * /auction/[id] — 拍卖详情页
 *
 * Per docs/05-spec-f4-auction.md §4 + §2.2:
 *   - 显示 scenario 标题 + 描述、嘉宾段位、bid count(只数,不显示金额/身份)
 *   - settled 后显示"心动权由嘉宾行使"或"最高价成交"标签 + finalAmountCents
 *   - 其他状态隐藏 finalAmountCents
 *
 * 匿名规则(08 §2):未 settled 的 bid amount/identity 一律不显示。
 */
import Link from "next/link"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"
import { auctions } from "@/db/schema/auctions"
import { eq, sql } from "drizzle-orm"

import { formatPrice } from "@/lib/server/auction-view"

export const dynamic = "force-dynamic"

type AuctionDetail = {
  id: string
  hostUserId: string
  hostDisplayName: string
  hostTrustLevel: number
  hostCompanyName: string | null
  scenarioTitle: string
  scenarioDesc: string
  durationMinutes: number
  guidePriceMinCents: number
  guidePriceMaxCents: number
  charityFlag: number
  status: "draft" | "live" | "closed" | "settled" | "cancelled"
  startsAt: Date
  endsAt: Date
  finalAmountCents: number | null
  settlementMethod: string | null
  settledAt: Date | null
}

type LoadResult =
  | { kind: "ok"; auction: AuctionDetail; bidCount: number }
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
    const [countRow] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(sql`auction_bids`)
      .where(sql`auction_id = ${id}`)
    return {
      kind: "ok",
      auction: row as AuctionDetail,
      bidCount: Number(countRow?.c ?? 0),
    }
  } catch (e) {
    // DATABASE_URL missing or transient: show graceful fallback (not "not found")
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

function statusLabel(s: AuctionDetail["status"]): string {
  switch (s) {
    case "draft":
      return "草稿"
    case "live":
      return "进行中"
    case "closed":
      return "已截拍 · 待嘉宾选标"
    case "settled":
      return "已成交"
    case "cancelled":
      return "已取消"
  }
}

export default async function AuctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await loadAuction(id)

  if (data.kind === "db_unavailable") {
    return (
      <section className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-8 sm:px-6">
        <SolidCard variant="elevated" className="p-6">
          <h1 className="text-2xl font-semibold">数据库暂时不可用</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            稍后再试。如果你是嘉宾且急着处理本专场,前往{" "}
            <Link href="/me" className="underline">
              个人中心
            </Link>
            。
          </p>
          <div className="mt-4">
            <SolidButton asChild variant="secondary" size="sm">
              <Link href="/auction">回专场列表</Link>
            </SolidButton>
          </div>
        </SolidCard>
      </section>
    )
  }

  if (data.kind === "not_found") {
    return (
      <section className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-8 sm:px-6">
        <SolidCard variant="elevated" className="p-6">
          <h1 className="text-2xl font-semibold">专场不存在</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            该专场可能已被取消或链接失效。
          </p>
          <div className="mt-4">
            <SolidButton asChild variant="secondary" size="sm">
              <Link href="/auction">回专场列表</Link>
            </SolidButton>
          </div>
        </SolidCard>
      </section>
    )
  }

  const { auction, bidCount } = data
  const isSettled = auction.status === "settled"

  return (
    <section className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-8 sm:px-6">
      <SolidCard variant="elevated" className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <TagPill tone="match">嘉宾 · L{auction.hostTrustLevel}</TagPill>
            {auction.hostCompanyName ? (
              <TagPill tone="neutral">{auction.hostCompanyName}</TagPill>
            ) : null}
            <TagPill
              tone={
                isSettled
                  ? "positive"
                  : auction.status === "cancelled"
                  ? "risk"
                  : "neutral"
              }
            >
              {statusLabel(auction.status)}
            </TagPill>
            {auction.charityFlag === 1 ? (
              <TagPill tone="positive">全捐 · 收据公示</TagPill>
            ) : null}
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {auction.scenarioTitle}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {auction.scenarioDesc}
          </p>

          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground">嘉宾</div>
              <div className="font-semibold">{auction.hostDisplayName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">时长</div>
              <div className="font-semibold">{auction.durationMinutes} 分钟</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">指导价</div>
              <div className="font-semibold">
                {formatPrice(auction.guidePriceMinCents)} ~{" "}
                {formatPrice(auction.guidePriceMaxCents)}
              </div>
            </div>
          </div>
        </div>
      </SolidCard>

      <SolidCard variant="subtle" className="p-6">
        <h2 className="text-base font-semibold">参与情况</h2>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-3xl font-bold text-foreground">{bidCount}</span>
          <span className="text-sm text-muted-foreground">人出价</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          盲拍出价,互相看不到金额和身份(08 §2 匿名规则)。
          出价人身份仅以段位形式在成交时公示。
        </p>
      </SolidCard>

      {isSettled ? (
        <SolidCard variant="elevated" className="p-6">
          <div className="flex flex-col gap-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              成交结果
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <TagPill tone="match">
                {auction.settlementMethod === "heart_pick"
                  ? "心动权由嘉宾行使"
                  : "最高价成交"}
              </TagPill>
              <span className="text-2xl font-bold text-foreground">
                {formatPrice(auction.finalAmountCents ?? 0)}
              </span>
              {auction.settledAt ? (
                <span className="text-xs text-muted-foreground">
                  {new Date(auction.settledAt).toLocaleString("zh-CN")}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {auction.charityFlag === 1
                ? "本场收入全额捐赠基金会,收据在公示页可查。平台不抽佣。"
                : "本场按平台规则抽佣,成交后进入履约流程。"}
            </p>
          </div>
        </SolidCard>
      ) : null}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Link href="/leaderboard" className="underline">
          看行情榜
        </Link>
        {auction.status === "closed" || auction.status === "settled" ? (
          <Link
            href={`/auction/${auction.id}/manage`}
            className="underline"
          >
            嘉宾管理
          </Link>
        ) : null}
      </div>
    </section>
  )
}