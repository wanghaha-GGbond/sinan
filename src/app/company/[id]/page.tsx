import Link from "next/link"
import { PenLine } from "lucide-react"

import { CompanyReviewFeed } from "@/components/company/company-review-feed"
import { EmptyState } from "@/components/common/state-blocks"
import { Badge } from "@/components/ui/badge"
import { SolidButton } from "@/components/ui/solid-button"
import { getCompany } from "@/lib/mock-data"

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const company = getCompany(id)

  return (
    <section className="mx-auto w-full max-w-[920px] px-4 py-4 sm:px-6">
      <div
        data-testid="company-sticky-header"
        className="glass-panel sticky top-14 z-40 mb-4 rounded-3xl border border-[#E5E7DB]/70 px-4 py-3"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-[#111827] sm:text-lg">{company.name}</h1>
            <p className="truncate text-xs text-[#6B7280] sm:text-sm">
              {company.industry} · {company.city} · 方向分 {company.directionScore.toFixed(1)} · {company.reviews.length} 条评价
            </p>
            {company.cbti ? <p className="truncate text-xs text-[#6B7280]">C-BTI {company.cbti.code} · {company.cbti.title}</p> : null}
          </div>
          <SolidButton asChild size="sm">
            <Link href="/submit/review">
            <PenLine />
            匿名评价
            </Link>
          </SolidButton>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-[#F1F5EF] px-3 py-2 text-xs text-[#6B7280] sm:text-sm">
        <span>方向分 {company.directionScore.toFixed(1)}</span>
        <span>｜</span>
        <span>推荐入职率 {company.recommendationRate}%</span>
        <span>｜</span>
        <span>{company.reviews.length} 条评价</span>
        {company.cbti ? (
          <>
            <span>｜</span>
            <span data-testid="company-cbti">C-BTI {company.cbti.code} · {company.cbti.title}</span>
          </>
        ) : null}
        {typeof company.scoreOfficeExperience === "number" ? (
          <>
            <span>｜</span>
            <span data-testid="company-office-experience">办公体验 {company.scoreOfficeExperience.toFixed(1)}</span>
          </>
        ) : null}
        {company.riskTags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary">
            #{tag}
          </Badge>
        ))}
      </div>

      {company.reviews.length === 0 ? (
        <EmptyState />
      ) : (
        <div data-testid="company-review-feed" className="min-w-0">
          <CompanyReviewFeed companyId={company.id} reviews={company.reviews} />
        </div>
      )}
    </section>
  )
}
