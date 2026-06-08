"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, BriefcaseBusiness, MapPin } from "lucide-react"

import { FilterBar } from "@/components/common/filter-bar"
import { ScoreChip } from "@/components/ui/score-chip"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { SolidEmptyState } from "@/components/ui/solid-empty-state"
import { TagPill } from "@/components/ui/tag-pill"
import { getOpportunityInsights } from "@/lib/glassdoor-insights"
import { companies } from "@/lib/mock-data"

type SortKey = "fit" | "city" | "company"
const SORT_OPTIONS = [
  { value: "fit", label: "适配度高" },
  { value: "city", label: "城市 A-Z" },
  { value: "company", label: "公司名 A-Z" },
] as const

export default function JobsPage() {
  const [industry, setIndustry] = useState<string>("all")
  const [city, setCity] = useState<string>("all")
  const [sort, setSort] = useState<SortKey>("fit")

  const opportunities = useMemo(() => getOpportunityInsights(companies).slice(0, 30), [])

  const industries = useMemo(
    () => Array.from(new Set(companies.map((c) => c.industry))).sort(),
    []
  )
  const opportunityCities = useMemo(
    () => Array.from(new Set(opportunities.map((o) => o.city))).sort(),
    [opportunities]
  )

  const filtered = useMemo(() => {
    const companyById = new Map(companies.map((c) => [c.id, c]))
    const matched = opportunities.filter((item) => {
      const c = companyById.get(item.companyId)
      if (industry !== "all" && c?.industry !== industry) return false
      if (city !== "all" && item.city !== city) return false
      return true
    })
    matched.sort((a, b) => {
      if (sort === "fit") return b.fitScore - a.fitScore
      if (sort === "city") return a.city.localeCompare(b.city, "zh")
      return a.companyName.localeCompare(b.companyName, "zh")
    })
    return matched
  }, [opportunities, industry, city, sort])

  return (
    <section className="mx-auto flex w-full max-w-page flex-col gap-5 px-4 py-6 sm:px-6">
      <SolidCard variant="risk" className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-destructive">
              <BriefcaseBusiness className="size-3.5" />
              岗位避雷
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">先看岗位背后的公司,再决定投不投</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              不是职位列表的搬运,而是把这家公司有什么岗位、城市分布、过来人的方向分和风险提醒放在一起,让你在投递前先看清。
            </p>
          </div>
          <SolidButton asChild variant="dark">
            <Link href="/search">搜索公司</Link>
          </SolidButton>
        </div>
      </SolidCard>

      <FilterBar
        industries={industries}
        cities={opportunityCities}
        sortOptions={SORT_OPTIONS}
        industry={industry}
        city={city}
        sort={sort}
        resultCount={filtered.length}
        onChangeIndustry={setIndustry}
        onChangeCity={setCity}
        onChangeSort={setSort}
        onReset={() => {
          setIndustry("all")
          setCity("all")
          setSort("fit")
        }}
      />

      {filtered.length === 0 ? (
        <SolidEmptyState
          title="还没有匹配的方向"
          description="换一个城市或行业,或者在搜索里直接看公司。"
          action={
            <SolidButton asChild variant="primary" size="sm">
              <Link href="/search">搜索公司</Link>
            </SolidButton>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((item) => (
            <SolidCard key={`${item.companyId}-${item.role}`} variant="subtle" className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">{item.role}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5" />
                    <span>{item.companyName}</span>
                    <span>{item.city}</span>
                  </p>
                </div>
                <ScoreChip score={item.fitScore} label="适配" compact />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.signal}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <TagPill
                    key={tag}
                    tone={tag.includes("压力") || tag.includes("波动") ? "risk" : "neutral"}
                  >
                    {tag}
                  </TagPill>
                ))}
              </div>
              <div className="mt-4">
                <SolidButton asChild variant="primary" size="sm">
                  <Link href={`/company/${item.companyId}`}>
                    看这家公司的真实评价
                    <ArrowRight className="size-4" />
                  </Link>
                </SolidButton>
              </div>
            </SolidCard>
          ))}
        </div>
      )}
    </section>
  )
}
