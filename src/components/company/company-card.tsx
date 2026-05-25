import Link from "next/link"
import { ArrowRight, MapPin } from "lucide-react"

import type { Company } from "@/lib/types"
import { MetricPill } from "@/components/ui/metric-pill"
import { ScoreChip } from "@/components/ui/score-chip"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"

export function CompanyCard({ company }: { company: Company }) {
  return (
    <SolidCard variant="subtle" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-[#111827]">{company.shortName}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#6B7280]">
            <span>{company.industry}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {company.city}
            </span>
          </p>
        </div>
        <ScoreChip score={company.directionScore} compact />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MetricPill label="推荐入职率" score={`${company.recommendationRate}%`} />
        <div className="rounded-2xl bg-[#F1F5EF] px-3 py-2">
          <p className="text-xs text-[#6B7280]">薪资区间</p>
          <p className="text-sm font-medium text-[#1F2937]">{company.salaryRange}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {company.riskTags.slice(0, 3).map((tag) => (
          <TagPill key={tag} tone={tag.includes("压力") || tag.includes("波动") ? "risk" : "neutral"}>
            #{tag}
          </TagPill>
        ))}
      </div>

      <p className="mt-3 text-sm text-[#6B7280]">{company.reviewCount.toLocaleString()} 条真实体验</p>
      {company.cbti ? (
        <p className="mt-2 text-xs text-[#6B7280]">
          C-BTI：{company.cbti.code} · {company.cbti.title}
        </p>
      ) : null}
      <div className="mt-3">
        <SolidButton asChild variant="primary" size="sm">
          <Link href={`/company/${company.id}`} className="inline-flex items-center gap-1">
            看这家公司
            <ArrowRight className="size-4" />
          </Link>
        </SolidButton>
      </div>
    </SolidCard>
  )
}
