import Link from "next/link"
import { BadgeCheck, PenLine, ShieldCheck } from "lucide-react"
import { notFound } from "next/navigation"

import { CompanyIntelligencePanel } from "@/components/company/company-intelligence-panel"
import { CompanyReviewFeed } from "@/components/company/company-review-feed"
import { DepartmentInsights } from "@/components/company/department-insights"
import { PromiseRecords } from "@/components/company/promise-records"
import { SentimentTrend } from "@/components/company/sentiment-trend"
import { ErrorState } from "@/components/common/error-state"
import { EmptyState } from "@/components/common/state-blocks"
import { Badge } from "@/components/ui/badge"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import type { CompanyListItem, Review } from "@/lib/types"
import { getDepartmentInsights, type DepartmentInsight } from "@/lib/server/department-insights"
import { getPublicCompanyDetail, getPublicCompanyReviews } from "@/lib/server/public-company-data"
import { mapPublicReview } from "@/lib/review-mappers"

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let company: CompanyListItem | null
  let reviewItems: Awaited<ReturnType<typeof getPublicCompanyReviews>>
  let departmentInsights: DepartmentInsight[]
  try {
    ;[company, reviewItems, departmentInsights] = await Promise.all([
      getPublicCompanyDetail(id),
      getPublicCompanyReviews(id),
      getDepartmentInsights(id),
    ])
  } catch {
    return (
      <ErrorState
        title="加载这家公司没成功"
        message="公司数据暂时不可用。请稍后重试，评价不会回退到演示数据。"
      />
    )
  }

  if (!company) notFound()
  const mappedReviews = reviewItems.map(mapPublicReview)

  if (company.reviewStatus === "pending_review") {
    return (
      <section className="mx-auto w-full max-w-section px-4 py-10 sm:px-6">
        <SolidCard variant="subtle" className="p-6" data-testid="company-pending-review-page">
          <p className="text-sm font-medium text-muted-foreground">{company.name}</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">该公司信息待审核</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
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

  // riskTags/highlights are in CompanyListItem; vibeTag/scoreOfficeExperience/scoreCanteen are not
  // pass as unknown→Company to CompanyIntelligencePanel — panel uses riskTags and scoreOfficeExperience
  // no-ops on missing fields at runtime
  // @ts-expect-error CompanyListItem is a partial shape of Company; runtime data is sufficient
  const companyForPanel: Parameters<typeof CompanyIntelligencePanel>[0]["company"] = company as Parameters<
    typeof CompanyIntelligencePanel
  >[0]["company"]

  return renderCompanyPage(company, mappedReviews, companyForPanel, departmentInsights)
}

function renderCompanyPage(
  company: CompanyListItem,
  mappedReviews: Review[],
  companyForPanel?: Parameters<typeof CompanyIntelligencePanel>[0]["company"],
  departmentInsights: DepartmentInsight[] = []
) {
  return (
    <section className="mx-auto w-full max-w-page px-4 py-4 sm:px-6">
      <div
        data-testid="company-sticky-header"
        className="sticky top-14 z-sticky mb-4 border-b border-border bg-background/95 px-1 py-3 backdrop-blur"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">{company.name}</h1>
            <p className="flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-muted-foreground sm:text-sm">
              <span>{company.industry}</span>
              <span>{company.city}</span>
              <span>方向分 {(company.directionScore ?? 0).toFixed(1)}</span>
              <span>{(company.reviewCount ?? 0)} 条评价</span>
            </p>
          </div>
          <SolidButton asChild size="sm">
            <Link href={`/submit/review?companyId=${company.id}`}>
              <PenLine />
              匿名评价
            </Link>
          </SolidButton>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border pb-4 text-xs text-muted-foreground sm:text-sm">
        <span>推荐入职率 {(company.recommendationRate ?? 0)}%</span>
        <span
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-muted px-3 font-medium text-foreground"
          title="完成企业邮箱或任职证明核验的匿名用户人数"
          data-testid="company-verified-identity-count"
        >
          <ShieldCheck className="size-3.5 text-primary" />
          {(company.verifiedIdentityCount ?? 0).toLocaleString()} 人已认证身份
        </span>
        {company.claimedStatus === "claimed" ? (
          <Badge variant="secondary" className="gap-1">
            <BadgeCheck className="size-3.5" />
            企业已认证
          </Badge>
        ) : (
          <Link
            href={`/company-verification?companyId=${encodeURIComponent(company.id)}&companyName=${encodeURIComponent(company.name)}`}
            className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary hover:underline"
          >
            <ShieldCheck className="size-3.5" />
            申请公司认证
          </Link>
        )}
        {(company.riskTags ?? []).slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary">
            #{tag}
          </Badge>
        ))}
      </div>

      <CompanyIntelligencePanel company={companyForPanel ?? (company as unknown as Parameters<typeof CompanyIntelligencePanel>[0]["company"])} />
      <DepartmentInsights insights={departmentInsights} />
      <PromiseRecords companyId={company.id} />
      <SentimentTrend companyId={company.id} companyName={company.name} />

      {mappedReviews.length === 0 ? (
        <EmptyState />
      ) : (
        <div data-testid="company-review-feed" className="min-w-0">
          <CompanyReviewFeed companyId={company.id} reviews={mappedReviews} />
        </div>
      )}
    </section>
  )
}
