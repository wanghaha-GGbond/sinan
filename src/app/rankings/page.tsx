"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { companies } from "@/lib/mock-data"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { ScoreChip } from "@/components/ui/score-chip"
import { TagPill } from "@/components/ui/tag-pill"

const tabs = ["高分", "高赞评价多", "最近活跃", "面试体验", "薪资讨论"] as const
type RankTab = (typeof tabs)[number]

export default function RankingsPage() {
  const [activeTab, setActiveTab] = useState<RankTab>("高分")

  const sorted = useMemo(() => {
    const list = [...companies]
    if (activeTab === "高赞评价多") return list.sort((a, b) => b.reviewCount - a.reviewCount)
    if (activeTab === "最近活跃") return list.sort((a, b) => b.trend.at(-1)!.reviews - a.trend.at(-1)!.reviews)
    if (activeTab === "面试体验") return list.sort((a, b) => b.reviews.filter((r) => r.relation === "面试者").length - a.reviews.filter((r) => r.relation === "面试者").length)
    if (activeTab === "薪资讨论") return list.sort((a, b) => b.reviews.filter((r) => /薪资|调薪|奖金|兑现/.test(r.content + r.shortComment)).length - a.reviews.filter((r) => /薪资|调薪|奖金|兑现/.test(r.content + r.shortComment)).length)
    return list.sort((a, b) => b.directionScore - a.directionScore)
  }, [activeTab])

  return (
    <section className="mx-auto flex w-full max-w-[920px] flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">公司发现</h1>
        <p className="mt-2 text-sm text-[#6B7280]">看看最近被更多过来人关注的公司</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <SolidButton
            key={tab}
            type="button"
            size="sm"
            variant={activeTab === tab ? "dark" : "secondary"}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </SolidButton>
        ))}
      </div>

      <div className="grid gap-4">
        {sorted.map((company, index) => (
          <SolidCard key={company.id} variant={index === 0 ? "elevated" : "subtle"} className="p-4">
            <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <div className="flex h-10 min-w-10 items-center justify-center rounded-full bg-[#F1F5EF] px-3 text-sm font-semibold text-[#1F2937]">
                {index + 1}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-[#111827]">{company.shortName}</h2>
                <p className="mt-1 text-sm text-[#6B7280]">
                  {company.industry} · {company.city} · {company.reviewCount} 条评价
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {company.riskTags.slice(0, 2).map((tag) => (
                    <TagPill key={tag} tone={tag.includes("压力") || tag.includes("波动") ? "risk" : "neutral"}>
                      #{tag}
                    </TagPill>
                  ))}
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
        ))}
      </div>
    </section>
  )
}

