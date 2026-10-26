"use client"

import { WebButton } from "@/components/ui/web-button"
import { useCompanySearch } from "@/lib/queries/company-search"

import { CompanyCard } from "./company-card"
import { CompanyListSkeleton } from "./company-list-skeleton"

export function HomeCompanyFeed() {
  const { data, isPending, error, refetch } = useCompanySearch()
  const companies = data?.slice(0, 6) ?? []

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
    </div>
  )
}
