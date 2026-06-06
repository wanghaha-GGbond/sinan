"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, ReceiptText, Search } from "lucide-react"

import { FilterBar } from "@/components/common/filter-bar"
import { ScoreChip } from "@/components/ui/score-chip"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { SolidEmptyState } from "@/components/ui/solid-empty-state"
import { getSalaryInsights } from "@/lib/glassdoor-insights"
import { companies } from "@/lib/mock-data"

type SortKey = "score" | "samples" | "company"
const SORT_OPTIONS = [
  { value: "score", label: "兑现分高" },
  { value: "samples", label: "样本多" },
  { value: "company", label: "公司名 A-Z" },
] as const

export default function SalariesPage() {
  const [industry, setIndustry] = useState<string>("all")
  const [city, setCity] = useState<string>("all")
  const [sort, setSort] = useState<SortKey>("score")

  const allInsights = useMemo(() => getSalaryInsights(companies), [])

  // Build industry/city option sets from the source companies (stable ordering).
  const industries = useMemo(
    () => Array.from(new Set(companies.map((c) => c.industry))).sort(),
    []
  )
  const cities = useMemo(
    () => Array.from(new Set(companies.map((c) => c.city))).sort(),
    []
  )

  const filtered = useMemo(() => {
    const companyById = new Map(companies.map((c) => [c.id, c]))
    const matched = allInsights.filter((item) => {
      const c = companyById.get(item.companyId)
      if (!c) return false
      if (industry !== "all" && c.industry !== industry) return false
      if (city !== "all" && c.city !== city) return false
      return true
    })
    matched.sort((a, b) => {
      if (sort === "score") return b.payScore - a.payScore
      if (sort === "samples") return b.sampleCount - a.sampleCount
      return a.companyName.localeCompare(b.companyName, "zh")
    })
    return matched
  }, [allInsights, industry, city, sort])

  return (
    <section className="mx-auto flex w-full max-w-[960px] flex-col gap-5 px-4 py-6 sm:px-6">
      <SolidCard variant="emerald" className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-secondary-foreground">
              <ReceiptText className="size-3.5" />
              薪资透明
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">按岗位看匿名薪资与兑现信号</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              从现有评价里提取薪资区间、奖金兑现、调薪透明度和岗位样本,作为入职前的谈薪参考。
            </p>
          </div>
          <SolidButton asChild variant="dark">
            <Link href="/submit/review">贡献薪资样本</Link>
          </SolidButton>
        </div>
      </SolidCard>

      <FilterBar
        industries={industries}
        cities={cities}
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
          setSort("score")
        }}
      />

      {filtered.length === 0 ? (
        <SolidEmptyState
          title="没有匹配的薪资样本"
          description="换一个行业或城市,或者贡献一条新的薪资样本。"
          action={
            <SolidButton asChild variant="primary" size="sm">
              <Link href="/submit/review">贡献薪资样本</Link>
            </SolidButton>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((item) => (
            <SolidCard key={`${item.companyId}-${item.role}`} variant="subtle" className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.role}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.companyName}</p>
                </div>
                <ScoreChip score={item.payScore} label="兑现分" compact />
              </div>
              <div className="mt-4 rounded-[24px] bg-muted p-4">
                <p className="text-xs text-muted-foreground">匿名薪资区间</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{item.range}</p>
                <p className="mt-1 text-sm text-muted-foreground">中位参考:{item.medianLabel} · {item.sampleCount} 个样本</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.signal}</p>
              <div className="mt-4 flex items-center justify-between">
                <SolidButton asChild variant="ghost" size="sm">
                  <Link href="/search">
                    <Search className="size-4" />
                    换家公司
                  </Link>
                </SolidButton>
                <SolidButton asChild variant="primary" size="sm">
                  <Link href={`/company/${item.companyId}`}>
                    公司页
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
