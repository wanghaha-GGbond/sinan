import Link from "next/link"
import { ArrowRight, MapPin } from "lucide-react"

import { MetricPill } from "@/components/ui/metric-pill"
import { ScoreChip } from "@/components/ui/score-chip"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"
import type { CompanyListItem } from "@/lib/api/types"
import type { Company } from "@/lib/types"

type CompanyCardCompany = Company | CompanyListItem

export function CompanyCard({ company }: { company: CompanyCardCompany }) {
  const displayName = (company as CompanyListItem).shortName ?? (company as Company).name ?? ""
  const salaryRange = (company as CompanyListItem).salaryRange ?? (company as Company).salaryRange

  return (
    <SolidCard variant="subtle" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-foreground">{displayName}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{company.industry}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {company.city}
            </span>
          </p>
        </div>
        <ScoreChip score={company.directionScore ?? 0} compact />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MetricPill label="推荐入职率" score={`${company.recommendationRate}%`} />
        {salaryRange ? (
          <div className="rounded-2xl bg-muted px-3 py-2">
            <p className="text-xs text-muted-foreground">薪资区间</p>
            <p className="text-sm font-medium text-foreground">{salaryRange}</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-muted px-3 py-2">
            <p className="text-xs text-muted-foreground">评价数</p>
            <p className="text-sm font-medium text-foreground">{(company.reviewCount ?? 0).toLocaleString()} 条评价</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(company.riskTags ?? []).slice(0, 3).map((tag) => (
          <TagPill key={tag} tone={tag.includes("压力") || tag.includes("波动") ? "risk" : "neutral"}>
            #{tag}
          </TagPill>
        ))}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{(company.reviewCount ?? 0).toLocaleString()} 条真实体验</p>
      {"vibeTag" in company && company.vibeTag ? (
        <p className="mt-2 text-xs text-muted-foreground">
          公司体感：{company.vibeTag.name}
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