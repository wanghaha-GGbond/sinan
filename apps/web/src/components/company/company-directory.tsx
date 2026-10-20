"use client"

import { useMemo, useState } from "react"
import { Building2, SlidersHorizontal } from "lucide-react"

import { CompanyCard } from "@/components/company/company-card"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidSearchInput } from "@/components/ui/solid-search-input"
import { useCompanySearch } from "@/lib/queries/company-search"

type SortMode = "reviews" | "score" | "recommendation"

export function CompanyDirectory() {
  const [query, setQuery] = useState("")
  const [city, setCity] = useState("全部")
  const [sort, setSort] = useState<SortMode>("reviews")
  const { data: companies = [], isPending: loading, error } = useCompanySearch()
  const cities = ["全部", ...Array.from(new Set(companies.map((company) => company.city)))]

  const filteredCompanies = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return companies
      .filter((company) => city === "全部" || company.city === city)
      .filter((company) => {
        if (!keyword) return true
        return [company.name, company.shortName, company.industry, company.city]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword))
      })
      .sort((a, b) => {
        if (sort === "score") return (b.directionScore ?? 0) - (a.directionScore ?? 0)
        if (sort === "recommendation") return (b.recommendationRate ?? 0) - (a.recommendationRate ?? 0)
        return (b.reviewCount ?? 0) - (a.reviewCount ?? 0)
      })
  }, [city, companies, query, sort])

  if (loading) {
    return <div className="h-48 animate-pulse rounded-3xl bg-muted" aria-label="正在加载公司" />
  }

  if (error && !companies.length) {
    return <p className="border-y border-border py-8 text-sm text-muted-foreground" role="status">公司数据暂时不可用，请稍后再试。</p>
  }

  return (
    <div className="space-y-5" data-testid="company-directory">
      <SolidSearchInput value={query} onChange={setQuery} />

      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="按城市筛选">
          {cities.map((item) => (
            <SolidButton
              key={item}
              type="button"
              size="sm"
              variant={city === item ? "dark" : "secondary"}
              onClick={() => setCity(item)}
              className="shrink-0"
            >
              {item}
            </SolidButton>
          ))}
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
          <SlidersHorizontal className="size-4" />
          排序
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
            className="h-10 border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring"
          >
            <option value="reviews">评价最多</option>
            <option value="score">方向分最高</option>
            <option value="recommendation">推荐率最高</option>
          </select>
        </label>
      </div>

      <p className="text-sm text-muted-foreground">找到 {filteredCompanies.length} 家公司</p>
      {filteredCompanies.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
