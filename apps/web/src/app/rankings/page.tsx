"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import {
  getBenefitInsights,
  getCompanySnapshot,
  getInterviewInsights,
  getSalaryInsights,
} from "@/lib/glassdoor-insights"
import { companies } from "@/lib/mock-data"
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
  const [activeTab, setActiveTab] = useState<RankTab>("score")

  // Pre-compute per-company insight scores once. Each tab then re-orders by
  // a different signal. We always use the same company list shape so the UI
  // doesn't re-mount.
  const snapshots = useMemo(() => {
    const salaryByCompany = new Map(getSalaryInsights(companies).map((s) => [s.companyId, s]))
    const interviewByCompany = new Map(getInterviewInsights(companies).map((s) => [s.companyId, s]))
    const benefitByCompany = new Map(getBenefitInsights(companies).map((s) => [s.companyId, s]))
    return companies.map((company) => {
      const snapshot = getCompanySnapshot(company)
      return {
        company,
        // signalScore: 0..10 score used for ranking on the active tab
        signalScore:
          activeTab === "score"
            ? company.directionScore
            : activeTab === "interview"
              ? interviewByCompany.get(company.id)?.experienceScore ?? company.directionScore
              : activeTab === "salary"
                ? salaryByCompany.get(company.id)?.payScore ?? company.directionScore
                : activeTab === "office"
                  ? benefitByCompany.get(company.id)?.officeScore ?? company.directionScore
                  : 0,
        // secondarySignal: count-style metric used for "most active" / "most reviewed"
        secondarySignal:
          activeTab === "reviews"
            ? company.reviewCount
            : activeTab === "active"
              ? company.trend.at(-1)?.reviews ?? 0
              : activeTab === "interview"
                ? snapshot.interviewCount
                : activeTab === "salary"
                  ? salaryByCompany.get(company.id)?.sampleCount ?? 0
                  : company.reviewCount,
        sampleCount: snapshot.interviewCount,
        salarySampleCount: snapshot.salarySamples,
      }
    })
  }, [activeTab])

  const sorted = useMemo(() => {
    const list = [...snapshots]
    // For "score-like" tabs, sort by signalScore desc.
    // For "count-like" tabs (reviews, active, salary sample), sort by secondarySignal desc.
    // Tie-break by directionScore, then by reviewCount, then by id for stable ordering.
    list.sort((a, b) => {
      if (activeTab === "score" || activeTab === "interview" || activeTab === "salary" || activeTab === "office") {
        if (b.signalScore !== a.signalScore) return b.signalScore - a.signalScore
      } else {
        if (b.secondarySignal !== a.secondarySignal) return b.secondarySignal - a.secondarySignal
      }
      if (b.company.directionScore !== a.company.directionScore) {
        return b.company.directionScore - a.company.directionScore
      }
      if (b.company.reviewCount !== a.company.reviewCount) {
        return b.company.reviewCount - a.company.reviewCount
      }
      return a.company.id.localeCompare(b.company.id)
    })
    return list
  }, [snapshots, activeTab])

  const activeDescription = tabs.find((tab) => tab.key === activeTab)?.description ?? ""

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
        {sorted.map(({ company, secondarySignal, signalScore, sampleCount, salarySampleCount }, index) => {
          const trailing =
            activeTab === "reviews"
              ? `${company.reviewCount.toLocaleString()} 条评价`
              : activeTab === "active"
                ? `近 30 天 +${secondarySignal} 条`
                : activeTab === "interview"
                  ? `${sampleCount} 条面试信号`
                  : activeTab === "salary"
                    ? `${salarySampleCount} 个薪资样本`
                    : activeTab === "office"
                      ? `办公 ${signalScore.toFixed(1)}`
                      : `${company.reviewCount.toLocaleString()} 条评价`

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
                  <h2 className="truncate text-lg font-semibold text-[#111827]">{company.shortName}</h2>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    {company.industry} · {company.city} · {trailing}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {company.riskTags.slice(0, 2).map((tag) => (
                      <TagPill
                        key={tag}
                        tone={tag.includes("压力") || tag.includes("波动") ? "risk" : "neutral"}
                      >
                        #{tag}
                      </TagPill>
                    ))}
                    {company.vibeTag ? (
                      <TagPill tone="positive">公司体感 {company.vibeTag.name}</TagPill>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                  <ScoreChip score={company.directionScore} compact />
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
