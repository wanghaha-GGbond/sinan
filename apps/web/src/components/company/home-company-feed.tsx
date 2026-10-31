"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowUpRight, ClipboardList, PenLine, ShieldCheck, Sparkles, UserRound } from "lucide-react"

import { WebButton } from "@/components/ui/web-button"
import { useCompanySearch } from "@/lib/queries/company-search"

import { CompanyCard } from "./company-card"
import { CompanyListSkeleton } from "./company-list-skeleton"

export function HomeCompanyFeed() {
  const { data, isPending, error, refetch } = useCompanySearch()
  const [visibleCount, setVisibleCount] = useState(6)
  const companies = data?.slice(0, visibleCount) ?? []

  function retry() {
    void refetch()
  }

  if (isPending) {
    return <CompanyListSkeleton />
  }

  if (error && !data) {
    return (
      <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border p-5">
        <p className="text-sm text-muted-foreground">公司数据暂时不可用，请稍后再试</p>
        <WebButton type="button" variant="secondary" size="sm" onClick={retry}>重试</WebButton>
      </div>
    )
  }

  if (companies.length === 0) {
    return <p className="rounded-2xl border p-5 text-sm text-muted-foreground">首批公司正在审核入库，欢迎稍后再来。</p>
  }

  return (
    <div className="border-t border-border">
      {companies.map((company) => <CompanyCard key={company.id} company={company} variant="feed" />)}
      {(data?.length ?? 0) > visibleCount ? <div className="p-4"><WebButton variant="secondary" className="w-full" onClick={() => setVisibleCount((count) => count + 6)}>查看更多公司</WebButton></div> : null}
    </div>
  )
}

export function HomeCompanySidebar() {
  const items = [
    { href: "/submit/review", label: "评分与评价", icon: PenLine },
    { href: "/submit/review?questionnaire=1", label: "问卷评分", icon: ClipboardList },
    { href: "/company-verification", label: "职业身份认证", icon: ShieldCheck },
    { href: "/skills", label: "一技封神", icon: Sparkles },
    { href: "/highlights", label: "高光馆", icon: Sparkles },
    { href: "/me", label: "个人主页", icon: UserRound },
  ]
  return <aside className="self-start border-t border-border p-4 sm:p-6 lg:sticky lg:top-20 lg:border-0" aria-label="在场功能">
    <h2 className="text-lg font-semibold">参与在场</h2>
    <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
      {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex min-h-12 min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-3 text-sm font-medium hover:border-primary-surface-border hover:text-primary-deep"><Icon className="size-4 shrink-0" aria-hidden="true" />{label}</Link>)}
    </div>
    <Link href="/community" className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary-deep">公司讨论<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
  </aside>
}
