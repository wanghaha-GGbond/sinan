"use client"

import { useMemo, useState } from "react"
import { Building2 } from "lucide-react"

import { CompanyCard } from "@/components/company/company-card"
import { CompanyListSkeleton } from "@/components/company/company-list-skeleton"
import { SolidSearchInput } from "@/components/ui/solid-search-input"
import { useCompanySearch } from "@/lib/queries/company-search"

type SortMode = "reviews" | "score" | "recent"

export function CompanyDirectory() {
  const [query, setQuery] = useState("")
  const [city, setCity] = useState("全部")
  const [sort, setSort] = useState<SortMode>("reviews")
  const [ratedOnly, setRatedOnly] = useState(false)
  const { data: companies = [], isPending: loading, error, refetch } = useCompanySearch()
  const cities = ["全部", ...Array.from(new Set(companies.map((company) => company.city)))]

  const filteredCompanies = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return companies
      .filter((company) => city === "全部" || company.city === city)
      .filter((company) => !ratedOnly || (company.reviewCount ?? 0) > 0)
      .filter((company) => {
        if (!keyword) return true
        return [company.name, company.shortName, company.industry, company.city]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword))
      })
      .sort((a, b) => {
        if (sort === "score") return (b.directionScore ?? 0) - (a.directionScore ?? 0)
        if (sort === "recent") return (b.createdAt ?? "").localeCompare(a.createdAt ?? "") || a.name.localeCompare(b.name, "zh-CN")
        return (b.reviewCount ?? 0) - (a.reviewCount ?? 0)
      })
  }, [city, companies, query, ratedOnly, sort])

  if (loading) {
    return <CompanyListSkeleton />
  }

  if (error && !companies.length) {
    return <div className="border-y border-border py-8 text-sm text-muted-foreground" role="status">公司数据暂时不可用，请稍后再试。<button type="button" className="ml-3 min-h-11 px-3 font-medium text-foreground underline" onClick={() => void refetch()}>重试</button></div>
  }

  return (
    <div data-testid="company-directory">
      <div className="grid gap-3 border-b border-border pb-6 lg:grid-cols-[minmax(0,1fr)_auto]">
        <SolidSearchInput value={query} onChange={setQuery} />
        <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2 text-muted-foreground">
          城市
          <select
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="h-12 max-w-36 rounded-lg border border-input bg-card px-3 font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {cities.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-muted-foreground">
          排序
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
            className="h-12 rounded-lg border border-input bg-card px-3 font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <option value="reviews">评价最多</option>
            <option value="score">评分最高</option>
            <option value="recent">最近收录</option>
          </select>
        </label>
        <label className="inline-flex min-h-11 items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={ratedOnly} onChange={(event) => setRatedOnly(event.target.checked)} className="size-4 accent-primary" />
          只看有评价
        </label>
        </div>
      </div>

      <p className="py-4 text-sm text-muted-foreground" aria-live="polite">找到 {filteredCompanies.length} 家公司 · {filteredCompanies.filter((company) => (company.reviewCount ?? 0) > 0).length} 家有评价</p>
      {filteredCompanies.length ? (
        <div className="border-t border-border">
          {filteredCompanies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      ) : (
        <div className="border-y border-border py-12 text-center">
          <Building2 className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-semibold text-foreground">没有匹配的公司</p>
          <p className="mt-1 text-sm text-muted-foreground">换个名称或城市试试。</p>
        </div>
      )}
    </div>
  )
}
