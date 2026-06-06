import Link from "next/link"
import { Compass, Home, Search, PenLine, TrendingUp, ArrowRight } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-[640px] flex-col items-center px-4 py-12 sm:py-20">
      <div
        className="mb-6 flex items-baseline gap-2 font-sans text-[7rem] font-bold leading-none text-foreground/15 tabular-nums sm:text-[9rem]"
        aria-hidden="true"
        data-numeric="true"
      >
        <span>4</span>
        <Compass className="size-16 -translate-y-2 text-primary sm:size-20" strokeWidth={1.4} />
        <span>4</span>
      </div>

      <SolidCard variant="elevated" className="w-full p-8 text-center sm:p-10">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Page not found
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground sm:text-3xl">
          这条路还没画在司南上
        </h1>
        <p className="mx-auto mt-3 max-w-[44ch] text-sm leading-6 text-muted-foreground">
          你访问的页面可能已下架、被合并,或者从未存在过。先回到推荐流,或者搜一家公司。
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <SolidButton asChild variant="primary" size="lg">
            <Link href="/">
              <Home className="size-4" />
              回到推荐流
            </Link>
          </SolidButton>
          <SolidButton asChild variant="secondary" size="lg">
            <Link href="/search">
              <Search className="size-4" />
              搜索公司
            </Link>
          </SolidButton>
        </div>
      </SolidCard>

      <p className="mt-6 text-xs text-muted-foreground">
        另一个常见入口:
        <Link
          href="/rankings"
          className="ml-1 inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-4 hover:underline"
        >
          看看本周榜单
          <ArrowRight className="size-3" />
        </Link>
        ,
        <Link
          href="/submit/review"
          className="ml-1 inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-4 hover:underline"
        >
          写一篇评价
          <PenLine className="size-3" />
        </Link>
        ,
        <Link
          href="/salaries"
          className="ml-1 inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-4 hover:underline"
        >
          查薪资区间
          <TrendingUp className="size-3" />
        </Link>
      </p>
    </section>
  )
}
