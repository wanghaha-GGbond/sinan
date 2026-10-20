"use client"

import { useMemo, useState } from "react"
import { Building2, SlidersHorizontal } from "lucide-react"

import { CompanyCard } from "@/components/company/company-card"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidSearchInput } from "@/components/ui/solid-search-input"
import type { Company } from "@/lib/types"

type SortMode = "reviews" | "score" | "recommendation"

export function CompanyDirectory({ companies }: { companies: Company[] }) {
  const [query, setQuery] = useState("")
  const [city, setCity] = useState("全部")
  const [sort, setSort] = useState<SortMode>("reviews")
  const cities = ["全部", ...Array.from(new Set(companies.map((company) => company.city)))]

  const filteredCompanies = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return companies
      .filter((company) => city === "全部" || company.city === city)
      .filter((company) => {
        if (!keyword) return true
        return [company.name, company.shortName, company.industry, company.city]
          .some((value) => value.toLowerCase().includes(keyword))
      })
      .sort((a, b) => {
        if (sort === "score") return b.directionScore - a.directionScore
        if (sort === "recommendation") return b.recommendationRate - a.recommendationRate
        return b.reviewCount - a.reviewCount
      })
  }, [city, companies, query, sort])

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
