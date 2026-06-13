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
import { TagPill } from "@/components/ui/tag-pill"
import { AuctionList, AuctionBidForm } from "@/components/auction/auction-list"

export const dynamic = "force-dynamic"

export default function AuctionPage() {
  return (
    <section className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-8 sm:px-6">
      <SolidCard variant="elevated" className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              大佬时间 · 公益专场
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              把「我想问过来人的问题」变成一场对话
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              嘉宾是 L2 以上的过来人,场景由他们自选(陪开评审会、模拟面试、晨跑请教都可以)。
              盲拍出价,嘉宾保留心动权(可以直接从候选里选一个人,不一定选最高价)。
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              M2 运营季:平台 0 抽佣,首季全部出价捐赠给具公开募捐资格的基金会,收据在收据公示页可查。
              司南是打工人评价公司的社区——拍卖是一个旁支,不是产品主线。
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <TagPill tone="match">首季 10 场</TagPill>
            <TagPill tone="neutral">全捐 · 收据公示</TagPill>
          </div>
        </div>
      </SolidCard>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <AuctionList />
        </div>
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <SolidCard variant="subtle" className="p-5">
            <h2 className="text-base font-semibold text-foreground">拍卖怎么玩</h2>
            <ol className="mt-3 space-y-3 text-sm text-foreground">
              <li>
                <span className="font-semibold">1. 看专场。</span>
                每场 72 小时,嘉宾自选场景(陪评审会 / 模拟面试 / 晨跑局…),
                系统给出指导价区间。
              </li>
              <li>
                <span className="font-semibold">2. 盲拍出价。</span>
                提交「金额 + 为什么是我」(10-200 字)。
                互相看不到出价和身份,只看到参与人数。
              </li>
              <li>
                <span className="font-semibold">3. 嘉宾心动。</span>
                截拍后 72 小时内嘉宾可以从全部候选里选一个人,
                不一定选最高价。「为什么是我」的权重由嘉宾定。
              </li>
              <li>
                <span className="font-semibold">4. 全捐。</span>
                平台不抽佣,首季全部成交金额捐基金会,收据公开。
              </li>
            </ol>
            <div className="mt-4 rounded-2xl bg-muted p-3 text-xs leading-5 text-muted-foreground">
              <p className="font-semibold text-foreground">嘉宾预期管理</p>
              <p className="mt-1">
                嘉宾的所在公司 / 部门评价内容,不会因参与拍卖获得任何特殊处理。
                这是邀请话术里写明的,也是平台的红线之一。
              </p>
            </div>
            <div className="mt-4">
              <SolidButton asChild variant="secondary" size="sm">
                <Link href="/">回到推荐</Link>
              </SolidButton>
            </div>
          </SolidCard>
        </aside>
      </div>

      {/* Slot for the bid form; rendered client-side after picking an auction */}
      <div id="auction-bid-form-slot" />
      <AuctionBidForm />
    </section>
  )
}
