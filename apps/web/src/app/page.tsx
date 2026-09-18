import Link from "next/link"
import { ArrowRight, Search, ShieldCheck } from "lucide-react"

import { HomeCompanyFeed } from "@/components/company/home-company-feed"
import { WebButton } from "@/components/ui/web-button"
import { WebSurface } from "@/components/ui/web-surface"

export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-page px-4 py-8 sm:px-6 lg:py-12" data-testid="home-recommend-feed">
      <WebSurface tone="base" className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
        <div>
          <p className="text-sm font-semibold text-primary-deep">在场 · 职场决策工具</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">入职前，先把这家公司看清楚。</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">真实公司、匿名评价与可追溯研报，帮助你在投递、面试和入职前做出更有依据的判断。</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <WebButton asChild variant="primary" size="lg"><Link href="/search"><Search className="size-4" />搜索公司</Link></WebButton>
            <WebButton asChild variant="secondary" size="lg"><Link href="/research">浏览研究<ArrowRight className="size-4" /></Link></WebButton>
          </div>
        </div>
        <div className="grid gap-3 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <div><p className="text-sm font-semibold text-foreground">匿名保护优先</p><p className="mt-1 text-xs leading-5 text-muted-foreground">只展示必要的身份等级，不公开个人证据。</p></div>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
            <div><p className="text-sm font-semibold text-foreground">评价先审后发</p><p className="mt-1 text-xs leading-5 text-muted-foreground">让后来者看到更接近事实的工作体验。</p></div>
          </div>
        </div>
      </WebSurface>

      <div className="mt-10 flex items-end justify-between gap-4">
        <div><h2 className="text-xl font-semibold text-foreground">最新公司</h2><p className="mt-1 text-sm text-muted-foreground">从真实评价开始，逐步补齐每家公司的证据。</p></div>
        <Link href="/search" className="text-sm font-semibold text-primary-deep hover:text-primary">搜索公司</Link>
      </div>
      <div className="mt-4"><HomeCompanyFeed /></div>
    </section>
  )
}
