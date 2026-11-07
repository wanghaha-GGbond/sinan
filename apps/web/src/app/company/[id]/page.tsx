import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { notFound } from "next/navigation"

import { CompanyDecisionInsights } from "@/components/company/company-decision-insights"
import { CompanyPageHeader } from "@/components/company/company-page-header"
import { CompanyDimensionSummaryPanel } from "@/components/company/company-dimension-summary"
import { CompanyEvidenceRail } from "@/components/company/company-evidence-rail"
import { CompanyReviewFeed } from "@/components/company/company-review-feed"
import { DepartmentInsights } from "@/components/company/department-insights"
import { PromiseRecords } from "@/components/company/promise-records"
import { SentimentTrend } from "@/components/company/sentiment-trend"
import { ErrorState } from "@/components/common/error-state"
import { WebButton } from "@/components/ui/web-button"
import { WebSurface } from "@/components/ui/web-surface"
import type { CompanyListItem } from "@/lib/types"
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
    return <ErrorState title="公司信息加载失败" message="请稍后重试。" />
  }

  if (!company) notFound()
  const mappedReviews = reviewItems.map(mapPublicReview)
  const reviewCount = company.reviewCount ?? 0

  if (company.reviewStatus === "pending_review") {
    return (
      <section className="mx-auto w-full max-w-section px-4 py-10 sm:px-6">
        <WebSurface tone="base" className="p-6" data-testid="company-pending-review-page">
          <p className="text-sm font-medium text-muted-foreground">{company.name}</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">该公司信息待审核</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">审核通过后开放评价。</p>
          <div className="mt-5"><WebButton asChild variant="secondary"><Link href="/">返回首页</Link></WebButton></div>
        </WebSurface>
      </section>
    )
  }

  return (
    <section className="min-h-[calc(100vh-160px)] bg-muted px-4 pb-12 pt-4 sm:px-8 sm:pt-6">
      <div className="mx-auto w-full max-w-page">
      <CompanyPageHeader company={company} active="概览" />

      {reviewCount > 0 ? <div className="mt-8"><CompanyDecisionInsights company={company} /></div> : null}

      <div className="mt-8 grid gap-8 min-[1200px]:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 rounded-lg border border-border bg-card p-5 sm:p-7">
          <h2 className="mb-5 text-xl font-semibold">评价概览</h2>
          {mappedReviews.length === 0 ? (
            <div className="border-y border-border py-10">
              <h3 className="text-lg font-semibold">暂无评价</h3>
              <Link href={`/submit/review?companyId=${encodeURIComponent(company.id)}`} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary-deep hover:underline">分享你的经历<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
            </div>
          ) : <div data-testid="company-review-feed" className="min-w-0"><CompanyReviewFeed companyId={company.id} reviews={mappedReviews} reviewCount={company.reviewCount ?? mappedReviews.length} previewLimit={1} /></div>}
          <div className="mt-6"><CompanyDimensionSummaryPanel dimensions={company.dimensionSummary} /></div>
          {reviewCount > 0 ? <div className="mt-8">
            <DepartmentInsights insights={departmentInsights} />
            <PromiseRecords companyId={company.id} />
            <SentimentTrend companyId={company.id} companyName={company.name} />
          </div> : null}
        </div>
        <CompanyEvidenceRail company={company} />
      </div>

      </div>
    </section>
  )
}
