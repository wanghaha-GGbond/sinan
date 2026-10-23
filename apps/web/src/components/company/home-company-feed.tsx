"use client"

import { useMemo, useState } from "react"

import { WebButton } from "@/components/ui/web-button"
import { useCompanySearch } from "@/lib/queries/company-search"

import { CompanyCard } from "./company-card"
import { CompanyListSkeleton } from "./company-list-skeleton"

export function HomeCompanyFeed() {
  const [activeTab, setActiveTab] = useState<"recommended" | "latest">("recommended")
  const { data, isPending, error, refetch } = useCompanySearch()
  const companies = useMemo(() => {
    const sorted = [...(data ?? [])].sort((a, b) => activeTab === "latest"
      ? (b.updatedAt ?? b.createdAt ?? "").localeCompare(a.updatedAt ?? a.createdAt ?? "") || b.id.localeCompare(a.id)
      : (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
    return sorted.slice(0, 12)
  }, [activeTab, data])

  function retry() {
    void refetch()
  }

  return (
    <div>
      <div role="tablist" aria-label="推荐信息流" className="grid grid-cols-2 border-b border-border">
        {([ ["recommended", "推荐"], ["latest", "最新"] ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeTab === value}
            onClick={() => setActiveTab(value)}
            className={`relative min-h-12 text-sm font-semibold transition-colors hover:bg-muted-hover ${activeTab === value ? "text-foreground after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-12 after:-translate-x-1/2 after:bg-primary" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={activeTab === "recommended" ? "推荐公司" : "最新公司"}>
        {isPending ? <CompanyListSkeleton /> : error && !data ? (
          <div role="status" className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-5">
            <p className="text-sm text-muted-foreground">公司数据暂时不可用，请稍后再试</p>
            <WebButton type="button" variant="secondary" size="sm" onClick={retry}>重试</WebButton>
          </div>
        ) : companies.length === 0 ? (
          <p className="border-b border-border px-4 py-5 text-sm text-muted-foreground">首批公司正在审核入库，欢迎稍后再来。</p>
        ) : companies.map((company) => <CompanyCard key={company.id} company={company} variant="feed" />)}
      </div>
    </div>
  )
}
