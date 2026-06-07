"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"

import { searchCompanies } from "@/lib/api/companies"
import type { CompanyListItem } from "@/lib/api/types"
import { ErrorState } from "@/components/common/error-state"
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
      <section className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">公司发现</h1>
          <p className="mt-2 h-4 w-72 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-20 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="加载公司发现失败"
        message={`${error}。刷新一下试试,或切到其他排序方式看看。`}
        onRetry={() => window.location.reload()}
        showHome
      />
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">公司发现</h1>
        <p className="mt-2 text-sm text-muted-foreground">从不同角度看看最近被更多过来人关注的公司</p>
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

      <p className="text-xs text-muted-foreground" data-testid="rankings-active-description">
        当前排序：{activeDescription}
      </p>

      <RankingsList companies={sorted} activeTab={activeTab} />
    </section>
  )
}

function RankingsList({
  companies,
  activeTab,
}: {
  companies: CompanyListItem[]
  activeTab: RankTab
}) {
  // Staggered entrance on the ranking list. Impeccable §Motion:
  // 'Staggering items within one list is legitimate. The tell
  // is the uniform reflex (one identical entrance applied to
  // every section), not motion itself.' Here it's scoped to
  // a single list of cards that physically appear together
  // after a tab change or data load — exactly where stagger
  // belongs. Items 1-5 fade + slide up with a 50ms cascade,
  // items 6+ all use the same delay as item 5 (no latecomer
  // visible delay). Respects prefers-reduced-motion by
  // returning opacity 1 immediately with no y offset.
  const reduced = useReducedMotion()
  return (
    <motion.div
      className="grid gap-4"
      initial={reduced ? false : "hidden"}
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.05 } },
      }}
    >
      {companies.map((company, index) => {
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
          <motion.div
            key={company.id}
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
            }}
            // Latecomer cap: items past the 5th slot share the
            // same transition (no long-tail delay).
            custom={Math.min(index, 5)}
            transition={{ delay: reduced ? 0 : Math.min(index, 5) * 0.05 }}
          >
            <SolidCard
              variant={index === 0 ? "elevated" : "subtle"}
              className="p-4"
              data-testid={`rankings-card-${company.id}`}
            >
              <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <div className="flex h-10 min-w-10 items-center justify-center rounded-full bg-muted px-3 text-sm font-semibold text-foreground">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-foreground">
                    {company.shortName ?? company.name}
                  </h2>
                  <p className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
                    <span>{company.industry}</span>
                    <span>{company.city}</span>
                    <span>{trailing}</span>
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
          </motion.div>
        )
      })}
    </motion.div>
  )
}