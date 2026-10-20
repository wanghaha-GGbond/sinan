import Link from "next/link"
import { Activity, ArrowRight, Building2, MapPin, PenLine, ShieldCheck } from "lucide-react"

import { CompanyCard } from "@/components/company/company-card"
import { SolidButton } from "@/components/ui/solid-button"
import { companies } from "@/lib/mock-data"

export default function HomePage() {
  const featuredCompanies = [...companies]
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 6)
  const totalReviews = companies.reduce((total, company) => total + company.reviewCount, 0)
  const cities = Array.from(new Set(companies.map((company) => company.city)))

  return (
    <section className="mx-auto w-full max-w-page px-4 py-5 sm:px-6" data-testid="home-recommend-feed">
      <header data-testid="home-brand-hero" className="border-b border-border pb-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <Building2 className="size-4" />
              公司广场
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">先看公司，再决定下一站</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              浏览真实员工体验，也可以用不到一分钟测评你的现公司或前公司。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SolidButton asChild variant="primary">
              <Link href="/submit/review">
                <PenLine className="size-4" />
                开始测评
              </Link>
            </SolidButton>
            <SolidButton asChild variant="secondary">
              <Link href="/companies">
                全部公司
                <ArrowRight className="size-4" />
              </Link>
            </SolidButton>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-border border-y border-border py-3 text-center">
          <div>
            <p className="text-xl font-semibold text-foreground">{companies.length}</p>
            <p className="text-xs text-muted-foreground">已收录公司</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-foreground">{totalReviews.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">匿名体验</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-foreground">{cities.length}</p>
            <p className="text-xs text-muted-foreground">热门城市</p>
          </div>
        </div>
      </header>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">大家最近在看</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            上海 · 深圳 · 杭州
          </p>
        </div>
        <Link href="/companies" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline">
          查看全部
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {featuredCompanies.map((company) => (
          <div key={company.id} data-testid="recommend-company-card">
            <CompanyCard company={company} />
          </div>
        ))}
      </div>

      <section className="mt-8 border-y border-border bg-foreground px-5 py-6 text-white sm:px-6" aria-labelledby="pulse-home-title">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-white">
              <Activity className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-white/60">COMPANY PULSE</p>
              <h2 id="pulse-home-title" className="mt-1 text-xl font-semibold">把本周工时、下班时间和恢复度变成一张圆环周报</h2>
              <p className="mt-2 text-sm text-white/70">每天两个问题，10 秒记录；公司趋势达到 30 人后匿名显示。</p>
            </div>
          </div>
          <SolidButton asChild variant="secondary" className="shrink-0">
            <Link href="/pulse">
              查看我的 Pulse
              <ArrowRight className="size-4" />
            </Link>
          </SolidButton>
        </div>
      </section>

      <div className="mt-8 flex flex-col gap-4 border-y border-border py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold text-foreground">你经历过的公司，也值得被看见</h2>
            <p className="mt-1 text-sm text-muted-foreground">无需社保号或雇佣证明，只选公司、岗位、状态和 Base。</p>
          </div>
        </div>
        <SolidButton asChild variant="dark" className="shrink-0">
          <Link href="/submit/review">测评现公司 / 前公司</Link>
        </SolidButton>
      </div>
    </section>
  )
}
