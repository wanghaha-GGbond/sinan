/**
 * /leaderboard — 拍卖行情榜
 *
 * Per docs/05-spec-f4-auction.md §2 "行情榜":
 *   - 按嘉宾维度展示历史成交价
 *   - per-嘉宾卡片:场景标题、最终金额、是否心动权、出价人数、是否全捐
 *   - 匿名:bidder 身份不公开,只段位
 */
import Link from "next/link"

import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"
import { getAuctionLeaderboard } from "@/lib/server/auction-leaderboard"
import { formatPrice } from "@/lib/server/auction-view"

export const dynamic = "force-dynamic"

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ hostId?: string }>
}) {
  const { hostId } = await searchParams

  let page: Awaited<ReturnType<typeof getAuctionLeaderboard>> = {
    items: [],
    nextCursor: null,
  }
  let dbAvailable = true
  try {
    page = await getAuctionLeaderboard({ hostId })
  } catch {
    dbAvailable = false
  }

  return (
    <section className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-8 sm:px-6">
      <SolidCard variant="elevated" className="p-6">
        <div className="flex flex-col gap-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            行情榜
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            大佬时间 · 历史成交
          </h1>
          <p className="text-sm text-muted-foreground">
            按时间倒序,只展示已成交的专场。出价人身份仅以段位形式公示,
            金额明细不暴露(08 §2)。
          </p>
        </div>
      </SolidCard>

      {!dbAvailable ? (
        <SolidCard variant="subtle" className="p-6">
          <p className="text-sm text-muted-foreground">
            数据库暂时不可用,稍后再来。
          </p>
        </SolidCard>
      ) : page.items.length === 0 ? (
        <SolidCard variant="subtle" className="p-6">
          <p className="text-sm text-muted-foreground">
            {hostId
              ? "该嘉宾还没有已成交的专场。"
              : "还没有已成交的专场,首批 10 场 M2 运营专场结束后会陆续上线。"}
          </p>
        </SolidCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {page.items.map((item) => (
            <SolidCard
              key={item.auctionId}
              variant="elevated"
              className="p-5"
            >
              <div className="flex items-center gap-2">
                <TagPill tone="match">嘉宾 L{item.host.trustLevel}</TagPill>
                {item.host.companyName ? (
                  <TagPill tone="neutral">{item.host.companyName}</TagPill>
                ) : null}
                {item.isCharity ? (
                  <TagPill tone="positive">全捐</TagPill>
                ) : null}
                {item.isHeartPick ? (
                  <TagPill tone="match">心动权</TagPill>
                ) : null}
              </div>
              <h2 className="mt-3 text-lg font-semibold text-foreground">
                <Link
                  href={`/auction/${item.auctionId}`}
                  className="hover:underline"
                >
                  {item.scenario}
                </Link>
              </h2>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {formatPrice(item.finalAmountCents)}
                </span>
                <span className="text-xs text-muted-foreground">成交</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>{item.bidsCount} 人出价</span>
                <span>·</span>
                <span>
                  {new Date(item.settledAt).toLocaleDateString("zh-CN")}
                </span>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                嘉宾:{item.host.displayName}
              </div>
            </SolidCard>
          ))}
        </div>
      )}
    </section>
  )
}