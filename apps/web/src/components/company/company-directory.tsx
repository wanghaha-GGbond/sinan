"use client"

import { Suspense, useMemo } from "react"
import { Building2 } from "lucide-react"

import { CompanyCard } from "@/components/company/company-card"
import { CompanyListSkeleton } from "@/components/company/company-list-skeleton"
import { SolidSearchInput } from "@/components/ui/solid-search-input"
import { useCompanySearch } from "@/lib/queries/company-search"
import { filterAndSortCompanies, type DirectorySort } from "@/lib/company-directory"
import { replaceUrlSearchParams, useUrlSearchParams } from "@/lib/use-url-search-params"

export function CompanyDirectory() {
  return <Suspense fallback={<CompanyListSkeleton variant="directory" />}><DirectoryResults /></Suspense>
}

function DirectoryResults() {
  const params = useUrlSearchParams()
  const query = params.get("q") ?? ""
  const city = params.get("city") || "全部"
  const requestedSort = params.get("sort") ?? "reviews"
  const sort: DirectorySort = ["reviews", "score", "recommendation", "recent"].includes(requestedSort) ? requestedSort as DirectorySort : "reviews"
  const ratedOnly = params.get("rated") === "1"
  function update(key: string, value: string) {
    const next = new URLSearchParams(window.location.search)
    if (value) next.set(key, value)
    else next.delete(key)
    replaceUrlSearchParams(next)
  }
  function resetFilters() { replaceUrlSearchParams(new URLSearchParams()) }
  const { data: companies = [], isPending: loading, error, refetch } = useCompanySearch()
  const cities = ["全部", ...Array.from(new Set([...companies.map((company) => company.city).filter(Boolean), ...(city === "全部" ? [] : [city])])).sort((a, b) => a.localeCompare(b, "zh-CN"))]

  const filteredCompanies = useMemo(() => filterAndSortCompanies(companies, { query, city, sort, ratedOnly }), [city, companies, query, sort, ratedOnly])

  if (loading) {
    return <CompanyListSkeleton variant="directory" />
  }

  if (error && !companies.length) {
    return <div className="border-y border-border py-8 text-sm text-muted-foreground" role="status">公司数据暂时不可用，请稍后再试。<button type="button" className="ml-3 min-h-11 px-3 font-medium text-foreground underline" onClick={() => void refetch()}>重试</button></div>
  }

  return (
    <div data-testid="company-directory">
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
        <SolidSearchInput value={query} onChange={value => update("q", value)} />
        <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2 text-muted-foreground">
          城市
          <select
            value={city}
            onChange={(event) => update("city", event.target.value === "全部" ? "" : event.target.value)}
            className="h-12 max-w-36 rounded-lg border border-input bg-card px-3 font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {cities.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-muted-foreground">
          排序
          <select
            value={sort}
            onChange={(event) => update("sort", event.target.value === "reviews" ? "" : event.target.value)}
            className="h-12 rounded-lg border border-input bg-card px-3 font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <option value="reviews">评价最多</option>
            <option value="score">评分最高</option>
            <option value="recommendation">推荐率最高</option>
            <option value="recent">最近收录</option>
          </select>
        </label>
        <label className="inline-flex min-h-11 items-center gap-2 text-foreground">
          <input type="checkbox" className="size-4 accent-primary" checked={ratedOnly} onChange={(event) => update("rated", event.target.checked ? "1" : "")} />
          只看有评价
        </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 py-3"><p className="text-sm text-muted-foreground" aria-live="polite">找到 {filteredCompanies.length} 家公司 · {filteredCompanies.filter((company) => (company.reviewCount ?? 0) > 0).length} 家有评价</p>{(query || city !== "全部" || ratedOnly || sort !== "reviews") && <button type="button" className="min-h-11 text-sm font-medium text-primary-deep underline" onClick={resetFilters}>清除筛选</button>}</div>
      {filteredCompanies.length ? (
        <div data-testid="company-directory-grid" className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          {filteredCompanies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      ) : (
        <div className="border-y border-border py-12 text-center">
          <Building2 className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-semibold text-foreground">{companies.length ? "没有匹配的公司" : "还没有收录的公司"}</p>
          {companies.length > 0 && <p className="mt-2 text-sm text-muted-foreground">试试其他关键词，或清除上方筛选。</p>}
        </div>
      )}
    </div>
  )
}
