"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Coffee, Gift, MonitorSmartphone, TrainFront } from "lucide-react"

import { FilterBar } from "@/components/common/filter-bar"
import { ScoreChip } from "@/components/ui/score-chip"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { SolidEmptyState } from "@/components/ui/solid-empty-state"
import { TagPill } from "@/components/ui/tag-pill"
import { getBenefitInsights } from "@/lib/glassdoor-insights"
import { companies } from "@/lib/mock-data"

type SortKey = "office" | "commute" | "canteen" | "company"
const SORT_OPTIONS = [
  { value: "office", label: "综合办公" },
  { value: "commute", label: "通勤便利" },
  { value: "canteen", label: "食堂好" },
  { value: "company", label: "公司名 A-Z" },
] as const

export default function BenefitsPage() {
  const [industry, setIndustry] = useState<string>("all")
  const [city, setCity] = useState<string>("all")
  const [sort, setSort] = useState<SortKey>("office")

  const allInsights = useMemo(() => getBenefitInsights(companies), [])

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
      if (sort === "office") return b.officeScore - a.officeScore
      if (sort === "commute") return b.commuteScore - a.commuteScore
      if (sort === "canteen") return b.canteenScore - a.canteenScore
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
              <Gift className="size-3.5" />
              福利与办公体验
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">把福利从口号拆成真实体验</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              聚合办公环境、通勤、食堂、下午茶、工位和设备等匿名样本,保留司南的「公司体感」表达。
            </p>
          </div>
          <SolidButton asChild variant="dark">
            <Link href="/submit/review">补充办公体验</Link>
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
          setSort("office")
        }}
      />

      {filtered.length === 0 ? (
        <SolidEmptyState
          title="没有匹配的办公体验"
          description="换一个行业或城市,或者贡献一条新的办公体验。"
          action={
            <SolidButton asChild variant="primary" size="sm">
              <Link href="/submit/review">补充办公体验</Link>
            </SolidButton>
          }
        />
      ) : (
        <div className="grid gap-4">
          {filtered.map((item) => (
            <SolidCard key={item.companyId} variant="subtle" className="p-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground">{item.companyName}</h2>
                    {item.tags.map((tag) => (
                      <TagPill key={tag} tone="neutral">
                        {tag}
                      </TagPill>
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.signal}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-[22px] bg-muted p-3">
                      <TrainFront className="size-4 text-primary" />
                      <p className="mt-2 text-xs text-muted-foreground">通勤</p>
                      <p className="font-semibold text-foreground">{item.commuteScore.toFixed(1)}</p>
                    </div>
                    <div className="rounded-[22px] bg-muted p-3">
                      <Coffee className="size-4 text-primary" />
                      <p className="mt-2 text-xs text-muted-foreground">食堂</p>
                      <p className="font-semibold text-foreground">{item.canteenScore.toFixed(1)}</p>
                    </div>
                    <div className="rounded-[22px] bg-muted p-3">
                      <MonitorSmartphone className="size-4 text-primary" />
                      <p className="mt-2 text-xs text-muted-foreground">综合办公</p>
                      <p className="font-semibold text-foreground">{item.officeScore.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 lg:justify-end">
                  <ScoreChip score={item.officeScore} label="体验分" compact />
                  <SolidButton asChild variant="primary" size="sm">
                    <Link href={`/company/${item.companyId}`}>
                      公司页
                      <ArrowRight className="size-4" />
                    </Link>
                  </SolidButton>
                </div>
              </div>
            </SolidCard>
          ))}
        </div>
      )}
    </section>
  )
}
