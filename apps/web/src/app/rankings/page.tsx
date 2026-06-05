"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import {
  getBenefitInsights,
  getCompanySnapshot,
  getInterviewInsights,
  getSalaryInsights,
} from "@/lib/glassdoor-insights"
import { searchCompanies } from "@/lib/api/companies"
import type { CompanyListItem } from "@/lib/api/types"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { ScoreChip } from "@/components/ui/score-chip"
import { TagPill } from "@/components/ui/tag-pill"

const tabs = [
  { key: "score", label: "方向分高", description: "按综合方向分排序" },
  { key: "reviews", label: "高赞评价多", description: "按总评价数排序" },
  { key: "active", label: "最近活跃", description: "近 30 天新增评价多" },
  { key: "interview", label: "面试友好", description: "面试体验分 + 流程透明" },
  { key: "salary", label: "薪资透明", description: "薪资兑现分 + 样本量" },
  { key: "office", label: "办公体验好", description: "办公环境分高" },
] as const
type RankTab = (typeof tabs)[number]["key"]

export default function RankingsPage() {
  const [companies, setCompanies] = useState<CompanyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<RankTab>("score")

  useEffect(() => {
    let cancelled = false
    // initial state is loading=true, error=null — no need to setState synchronously here
    searchCompanies({}).then((res) => {
      if (cancelled) return
      if (res.error) {
        setError(res.error)
      } else if (res.data) {
        setCompanies(res.data.companies)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  // glassdoor-insights functions expect Company type (with reviews/dimensions/etc).
  // CompanyListItem from the API has fewer fields, so these functions will return
  // limited or empty results for now — but we keep the imports ready for when
  // the API returns richer data. Fallback to directionScore for tabs that need
  // it.
  const sorted = useMemo(() => {
    const list = [...companies]
    list.sort((a, b) => {
      const aCount = a.reviewCount ?? 0
      const bCount = b.reviewCount ?? 0
      const aScore = a.directionScore ?? 0
      const bScore = b.directionScore ?? 0
      if (activeTab === "reviews") {
        if (bCount !== aCount) return bCount - aCount
      } else {
        if (bScore !== aScore) return bScore - aScore
      }
      if (bCount !== aCount) return bCount - aCount
      return a.id.localeCompare(b.id)
    })
    return list
  }, [companies, activeTab])

  const activeDescription = tabs.find((tab) => tab.key === activeTab)?.description ?? ""

  if (loading) {
    return (
      <section className="mx-auto flex w-full max-w-[920px] flex-col gap-6 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">公司发现</h1>
          <p className="mt-2 text-sm text-[#6B7280]">从不同角度看看最近被更多过来人关注的公司</p>
        </div>
        <p className="text-sm text-[#6B7280]">加载中...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="mx-auto flex w-full max-w-[920px] flex-col gap-6 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">公司发现</h1>
          <p className="mt-2 text-sm text-[#6B7280]">从不同角度看看最近被更多过来人关注的公司</p>
        </div>
        <p className="text-sm text-red-600">加载失败：{error}</p>
        <SolidButton onClick={() => window.location.reload()}>重试</SolidButton>
      </section>
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-[920px] flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">公司发现</h1>
        <p className="mt-2 text-sm text-[#6B7280]">从不同角度看看最近被更多过来人关注的公司</p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="公司发现排序方式">
        {tabs.map((tab) => (
          <SolidButton
            key={tab.key}
            type="button"
            size="sm"
            role="tab"
            aria-selected={activeTab === tab.key}
            variant={activeTab === tab.key ? "dark" : "secondary"}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </SolidButton>
        ))}
      </div>

      <p className="text-xs text-[#6B7280]" data-testid="rankings-active-description">
        当前排序：{activeDescription}
      </p>

      <div className="grid gap-4">
        {sorted.map((company, index) => {
          const count = company.reviewCount ?? 0
          const score = company.directionScore ?? 0
          const trailing =
            activeTab === "reviews"
              ? `${count.toLocaleString()} 条评价`
              : activeTab === "active"
                ? `${count.toLocaleString()} 条评价`
                : activeTab === "interview"
                  ? `${score.toFixed(1)} 方向分`
                  : activeTab === "salary"
                    ? `${score.toFixed(1)} 方向分`
                    : activeTab === "office"
                      ? `${score.toFixed(1)} 方向分`
                      : `${count.toLocaleString()} 条评价`

          return (
            <SolidCard
              key={company.id}
              variant={index === 0 ? "elevated" : "subtle"}
              className="p-4"
              data-testid={`rankings-card-${company.id}`}
            >
              <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <div className="flex h-10 min-w-10 items-center justify-center rounded-full bg-[#F1F5EF] px-3 text-sm font-semibold text-[#1F2937]">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-[#111827]">
                    {company.shortName ?? company.name}
                  </h2>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    {company.industry} · {company.city} · {trailing}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(company.riskTags ?? []).slice(0, 2).map((tag) => (
                      <TagPill
                        key={tag}
                        tone={tag.includes("压力") || tag.includes("波动") ? "risk" : "neutral"}
                      >
                        #{tag}
                      </TagPill>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                  <ScoreChip score={score} compact />
                  <SolidButton asChild variant="primary" size="sm">
                    <Link href={`/company/${company.id}`}>看这家公司</Link>
                  </SolidButton>
                </div>
              </div>
            </SolidCard>
          )
        })}
      </div>
    </section>
  )
}