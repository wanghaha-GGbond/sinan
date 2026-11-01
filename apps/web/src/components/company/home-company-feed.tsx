"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowUpRight, ClipboardList, PenLine, ShieldCheck, Sparkles, UserRound } from "lucide-react"

import { WebButton } from "@/components/ui/web-button"
import { useCompanySearch } from "@/lib/queries/company-search"

import { CompanyCard } from "./company-card"
import { CompanyListSkeleton } from "./company-list-skeleton"
import { filterAndSortCompanies } from "@/lib/company-directory"

export function HomeCompanyFeed() {
  const { data, isPending, error, refetch } = useCompanySearch()
  const [visibleCount, setVisibleCount] = useState(6)
  const [activeTab, setActiveTab] = useState<"recommended" | "latest">("recommended")
  const companies = useMemo(() => filterAndSortCompanies(data ?? [], {
    query: "", city: "全部", ratedOnly: false, sort: activeTab === "latest" ? "recent" : "reviews",
  }).slice(0, visibleCount), [activeTab, data, visibleCount])

  function retry() {
    void refetch()
  }

  return (
    <div>
      <div role="tablist" aria-label="推荐信息流" className="grid grid-cols-2 border-b border-border">
        {([["recommended", "推荐"], ["latest", "最新"]] as const).map(([value, label]) => (
          <button key={value} type="button" role="tab" id={`feed-tab-${value}`} aria-controls="company-feed-panel"
            aria-selected={activeTab === value}
            onClick={() => { setActiveTab(value); setVisibleCount(6) }}
            className={`relative min-h-12 text-sm font-semibold hover:bg-muted-hover focus-visible:outline-2 focus-visible:outline-ring ${activeTab === value ? "text-foreground after:absolute after:inset-x-[calc(50%-1.5rem)] after:bottom-0 after:h-0.5 after:bg-primary" : "text-muted-foreground"}`}>
            {label}
          </button>
        ))}
      </div>
      <div id="company-feed-panel" role="tabpanel" aria-labelledby={`feed-tab-${activeTab}`}>
      {isPending ? <CompanyListSkeleton /> : error && !data ? (
        <div role="status" className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-5">
          <p className="text-sm text-muted-foreground">公司数据暂时不可用，请稍后再试</p>
          <WebButton type="button" variant="secondary" size="sm" onClick={retry}>重试</WebButton>
        </div>
      ) : companies.length === 0 ? <p className="border-b border-border px-4 py-5 text-sm text-muted-foreground">首批公司正在审核入库，欢迎稍后再来。</p>
        : companies.map((company) => <CompanyCard key={company.id} company={company} variant="feed" />)}
      {(data?.length ?? 0) > visibleCount ? <div className="p-4"><WebButton variant="secondary" className="w-full" onClick={() => setVisibleCount((count) => count + 6)}>查看更多公司</WebButton></div> : null}
      </div>
    </div>
  )
}

export function HomeCompanySidebar() {
  const { data = [], isPending, error } = useCompanySearch()
  const newlyListed = useMemo(() => filterAndSortCompanies(data.filter((company) => (company.reviewCount ?? 0) === 0), {
    query: "", city: "全部", ratedOnly: false, sort: "recent",
  }).slice(0, 5), [data])
  const items = [
    { href: "/submit/review", label: "评分与评价", icon: PenLine },
    { href: "/submit/review?questionnaire=1", label: "问卷评分", icon: ClipboardList },
    { href: "/company-verification", label: "职业身份认证", icon: ShieldCheck },
    { href: "/skills", label: "一技封神", icon: Sparkles },
    { href: "/highlights", label: "高光馆", icon: Sparkles },
    { href: "/me", label: "个人主页", icon: UserRound },
  ]
  return <aside className="self-start border-t border-border p-4 sm:p-6 lg:sticky lg:top-20 lg:border-0" aria-label="新收录公司与功能">
    <section aria-label="新收录公司" className="hidden lg:block">
      <h2 className="text-base font-semibold">新收录公司</h2>
      {isPending ? <p className="py-4 text-sm text-muted-foreground">正在加载…</p> : error && !data.length ? null : newlyListed.length ? (
        <div className="mt-4 divide-y divide-border border-y border-border">
          {newlyListed.map((company) => <Link key={company.id} href={`/company/${company.id}`} className="block py-4 hover:bg-muted-hover focus-visible:outline-2 focus-visible:outline-ring">
            <span className="block break-words text-sm font-semibold">{company.shortName ?? company.name}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{company.industry} · {company.city}</span>
          </Link>)}
        </div>
      ) : <p className="py-4 text-sm text-muted-foreground">暂无新收录公司</p>}
      <Link href="/companies" className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-primary-deep hover:underline">查看全部公司</Link>
    </section>
    <details className="group mt-4 border-t border-border pt-4" open>
    <summary className="min-h-11 cursor-pointer text-sm font-semibold">参与在场</summary>
    <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-1">
      {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex min-h-12 min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-3 text-sm font-medium hover:border-primary-surface-border hover:text-primary-deep"><Icon className="size-4 shrink-0" aria-hidden="true" />{label}</Link>)}
    </div>
    <Link href="/community" className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary-deep">公司讨论<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
    </details>
  </aside>
}
