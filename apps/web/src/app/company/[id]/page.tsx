import Link from "next/link"
import { BadgeCheck, BarChart3, ChevronRight, MapPin, ShieldCheck } from "lucide-react"
import { notFound } from "next/navigation"

import { CompanyDecisionInsights } from "@/components/company/company-decision-insights"
import { CompanyEvidenceRail } from "@/components/company/company-evidence-rail"
import { CompanyReviewFeed } from "@/components/company/company-review-feed"
import { DepartmentInsights } from "@/components/company/department-insights"
import { PromiseRecords } from "@/components/company/promise-records"
import { SentimentTrend } from "@/components/company/sentiment-trend"
import { ErrorState } from "@/components/common/error-state"
import { EmptyState } from "@/components/common/state-blocks"
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
    return <ErrorState title="加载这家公司没成功" message="公司数据暂时不可用。请稍后重试，评价不会回退到演示数据。" />
  }

  if (!company) notFound()
  const mappedReviews = reviewItems.map(mapPublicReview)

  if (company.reviewStatus === "pending_review") {
    return (
      <section className="mx-auto w-full max-w-section px-4 py-10 sm:px-6">
        <WebSurface tone="base" className="p-6" data-testid="company-pending-review-page">
          <p className="text-sm font-medium text-muted-foreground">{company.name}</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">该公司信息待审核</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">已有用户提交公司注册信息，审核通过后即可评价。审核前不展示方向分、公司体感和评论流。</p>
          <div className="mt-5"><WebButton asChild variant="secondary"><Link href="/">返回推荐</Link></WebButton></div>
        </WebSurface>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1340px] px-4 py-6 sm:px-6 lg:px-0 lg:pb-8 lg:pt-6">
      <div className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/search" className="hover:text-foreground">找公司</Link>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span>{company.name}</span>
      </div>

      <header className="border-b border-border pb-0">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-5 lg:gap-10">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-primary-deep sm:size-24 lg:size-32" aria-label={`${company.name}公司标志`} role="img">
              <BarChart3 className="size-9 sm:size-11 lg:size-14" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 lg:ml-7">
              <h1 className="truncate text-[2rem] font-semibold leading-tight tracking-[-0.035em] text-foreground sm:text-[2.25rem]">{company.name}</h1>
              <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>{company.industry}</span>
                <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{company.city}</span>
                {company.claimedStatus === "claimed" ? <span className="inline-flex items-center gap-1 text-primary-deep"><BadgeCheck className="size-3.5" />企业已认证</span> : null}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2.5">
                <span className="text-[2rem] font-semibold leading-none tabular-nums text-primary-deep">{(company.directionScore ?? 0).toFixed(1)}</span>
                <span className="text-base tracking-[0.16em] text-primary" aria-label="公司评分">★★★★☆</span>
                <span className="text-sm text-muted-foreground">{(company.reviewCount ?? 0).toLocaleString()} 条评价</span>
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ShieldCheck className="size-4 text-primary" />匿名评价 · 人工审核</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end lg:pt-1 lg:pr-6">
            <div className="flex items-center gap-4">
              <WebButton variant="secondary" className="lg:min-h-[52px] lg:min-w-[132px] lg:px-7">关注公司</WebButton>
              <WebButton asChild variant="primary" className="lg:min-h-[52px] lg:min-w-[126px] lg:px-7"><Link href={`/submit/review?companyId=${encodeURIComponent(company.id)}`}>写评价</Link></WebButton>
            </div>
            <p className="text-xs text-muted-foreground">{(company.reviewCount ?? 0).toLocaleString()} 条公开评价 · {company.verifiedIdentityCount ?? 0} 位验证贡献者</p>
          </div>
        </div>
        <nav className="mt-7 flex gap-7 overflow-x-auto" aria-label="公司信息导航">
          {[
            ["概览", `/company/${company.id}`],
            ["评价", `/company/${company.id}/reviews`],
            ["评分", `/company/${company.id}/ratings`],
            ["承诺", `/company/${company.id}/promises`],
          ].map(([label, href]) => (
            <Link key={href} href={href} className={`shrink-0 border-b-2 pb-3.5 text-sm font-semibold ${label === "评价" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mt-4"><CompanyDecisionInsights company={company} /></div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0">
          {mappedReviews.length === 0 ? <EmptyState /> : <div data-testid="company-review-feed" className="min-w-0"><CompanyReviewFeed companyId={company.id} reviews={mappedReviews} reviewCount={company.reviewCount ?? mappedReviews.length} previewLimit={1} /></div>}
        </div>
        <CompanyEvidenceRail company={company} />
      </div>

      <div className="mt-8">
        <DepartmentInsights insights={departmentInsights} />
        <PromiseRecords companyId={company.id} />
        <SentimentTrend companyId={company.id} companyName={company.name} />
      </div>
    </section>
  )
}
