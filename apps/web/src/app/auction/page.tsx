/**
 * M2 公益拍卖 — 静态专场页。
 *
 * Per docs/05-spec-f4-auction.md §3: this is a "运营级" page, no
 * bidding engine. The page lists the live + recently-settled auctions
 * the operator has published, and a "我要报名" form that POSTs to
 * /api/auctions/[id]/bids.
 *
 * Charity: the page-level copy makes the all-donated promise clear.
 * Compliance (08): no real-money flow goes through the platform, so
 * 增值电信 / 资金池 风险 doesn't apply until M3.
 *
 * All copy stays in 打工人 voice — no "尊贵 / 尊享" / "限时秒杀" 等
 * 溢价话术。The auction is sold as a way to ask someone who's been
 * there a real question, period.
 */
import Link from "next/link"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { AuctionList, AuctionBidForm } from "@/components/auction/auction-list"

export const dynamic = "force-dynamic"

export default function AuctionPage() {
  return (
    <section className="mx-auto flex w-full max-w-page flex-col gap-5 px-4 py-6 sm:px-6">

      {/* Hero */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">大佬时间</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            把「我想问过来人的问题」变成一场真实对话。盲拍出价，嘉宾保留心动权。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
              M2 运营季 · 首季 10 场
            </span>
            <span className="rounded-full bg-[#f0fdf4] px-3 py-1 text-xs font-semibold text-[#15803d]">
              全捐 · 收据公示
            </span>
          </div>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">平台 0 抽佣</span>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <AuctionList />

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <SolidCard variant="subtle" className="p-5">
            <h2 className="text-sm font-bold text-foreground">拍卖怎么玩</h2>
            <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
              <li><span className="font-semibold text-foreground">1. 看专场。</span> 每场 72 小时，嘉宾自选场景，系统给出指导价区间。</li>
              <li><span className="font-semibold text-foreground">2. 盲拍出价。</span> 提交「金额 + 为什么是我」，互相看不到出价和身份，只看到参与人数。</li>
              <li><span className="font-semibold text-foreground">3. 嘉宾心动。</span> 截拍后 72 小时内嘉宾可从全部候选里选一个人，不一定选最高价。</li>
              <li><span className="font-semibold text-foreground">4. 全捐。</span> 首季全部成交金额捐基金会，收据公开。</li>
            </ol>
            <div className="mt-4 rounded-2xl bg-muted px-4 py-3 text-xs leading-5 text-muted-foreground">
              <p className="font-semibold text-foreground">嘉宾预期管理</p>
              <p className="mt-1">嘉宾所在公司的评价内容，不因参与拍卖获得任何特殊处理。这是邀请话术里写明的红线。</p>
            </div>
            <div className="mt-4">
              <SolidButton asChild variant="secondary" size="sm">
                <Link href="/">回到推荐</Link>
              </SolidButton>
            </div>
          </SolidCard>
        </aside>
      </div>

      <div id="auction-bid-form-slot" />
      <AuctionBidForm />
    </section>
  )
}
