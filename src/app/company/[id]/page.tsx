import Link from "next/link"
import { PenLine } from "lucide-react"

import { CompanyReviewFeed } from "@/components/company/company-review-feed"
import { EmptyState } from "@/components/common/state-blocks"
import { Badge } from "@/components/ui/badge"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { getCompany } from "@/lib/mock-data"

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const company = getCompany(id)

  if (company.reviewStatus === "pending_review") {
    return (
      <section className="mx-auto w-full max-w-[760px] px-4 py-10 sm:px-6">
        <SolidCard variant="subtle" className="p-6" data-testid="company-pending-review-page">
          <p className="text-sm font-medium text-[#6B7280]">{company.name}</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#111827]">该公司信息待审核</h1>
          <p className="mt-3 text-sm leading-6 text-[#6B7280]">
            已有用户提交公司注册信息，审核通过后即可评价。审核前不展示方向分、公司体感和评论流。
          </p>
          <div className="mt-5">
            <SolidButton asChild variant="primary">
              <Link href="/">返回推荐</Link>
            </SolidButton>
          </div>
        </SolidCard>
      </section>
    )
  }

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
            {company.vibeTag ? <p className="truncate text-xs text-[#6B7280]">公司体感：{company.vibeTag.name}</p> : null}
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
        {company.vibeTag ? (
          <>
            <span>｜</span>
            <span data-testid="company-vibe-tag">公司体感 {company.vibeTag.name}</span>
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
