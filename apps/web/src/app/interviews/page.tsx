"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, MessageSquareText } from "lucide-react"

import { FilterBar } from "@/components/common/filter-bar"
import { ScoreChip } from "@/components/ui/score-chip"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { SolidEmptyState } from "@/components/ui/solid-empty-state"
import { TagPill } from "@/components/ui/tag-pill"
import { getInterviewInsights } from "@/lib/glassdoor-insights"
import { companies } from "@/lib/mock-data"

type SortKey = "score" | "samples" | "company"
const SORT_OPTIONS = [
  { value: "score", label: "体验分高" },
  { value: "samples", label: "样本多" },
  { value: "company", label: "公司名 A-Z" },
] as const

export default function InterviewsPage() {
  const [industry, setIndustry] = useState<string>("all")
  const [city, setCity] = useState<string>("all")
  const [sort, setSort] = useState<SortKey>("score")

  const allInsights = useMemo(() => getInterviewInsights(companies), [])

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
      if (sort === "score") return b.experienceScore - a.experienceScore
      if (sort === "samples") return b.sampleCount - a.sampleCount
      return a.companyName.localeCompare(b.companyName, "zh")
    })
    return matched
  }, [allInsights, industry, city, sort])

  return (
    <section className="mx-auto flex w-full max-w-[960px] flex-col gap-5 px-4 py-6 sm:px-6">
      <SolidCard variant="elevated" className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              <MessageSquareText className="size-3.5" />
              面试情报
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">提前知道流程、轮次和真实体验</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              聚合面试者和过来人的匿名样本,帮助你确认轮次、等待时间、题目相关性和团队沟通方式。
            </p>
          </div>
          <SolidButton asChild variant="primary">
            <Link href="/submit/review">写面试体验</Link>
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
          title="没有匹配的面试信号"
          description="换一个行业或城市,或者贡献一条新的面试体验。"
          action={
            <SolidButton asChild variant="primary" size="sm">
              <Link href="/submit/review">写面试体验</Link>
            </SolidButton>
          }
        />
      ) : (
        <div className="grid gap-4">
          {filtered.map((item) => (
            <SolidCard key={item.companyId} variant="subtle" className="p-4">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground">{item.companyName}</h2>
                    <TagPill tone="neutral">{item.role}</TagPill>
                    <TagPill tone="match">{item.rounds}</TagPill>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.signal}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{item.sampleCount} 条匿名面试/流程信号</p>
                </div>
                <div className="flex items-center gap-3 md:justify-end">
                  <ScoreChip score={item.experienceScore} label="体验分" compact />
                  <SolidButton asChild variant="primary" size="sm">
                    <Link href={`/company/${item.companyId}`}>
                      看公司
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
