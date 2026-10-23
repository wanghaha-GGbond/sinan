import Link from "next/link"
import { BadgeCheck, ChevronRight, MapPin, PenLine, ShieldCheck } from "lucide-react"
import { notFound } from "next/navigation"

import { CompanyDecisionInsights } from "@/components/company/company-decision-insights"
import { CompanyEvidenceRail } from "@/components/company/company-evidence-rail"
import { CompanyReviewFeed } from "@/components/company/company-review-feed"
import { CompanyRating, companyDisplayScore } from "@/components/company/company-rating"
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
  const displayScore = companyDisplayScore(company.directionScore, reviewCount)

  if (company.reviewStatus === "pending_review") {
    return (
      <section className="mx-auto w-full max-w-section px-4 py-10 sm:px-6">
        <WebSurface tone="base" className="p-6" data-testid="company-pending-review-page">
          <p className="text-sm font-medium text-muted-foreground">{company.name}</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">该公司信息待审核</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">审核通过后开放评价。</p>
          <div className="mt-5"><WebButton asChild variant="secondary"><Link href="/">返回推荐</Link></WebButton></div>
        </WebSurface>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-page px-4 pb-12 pt-4 sm:px-8 sm:pt-6">
      <nav aria-label="面包屑" className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/search" className="inline-flex min-h-11 items-center hover:text-foreground">找公司</Link>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span>{company.name}</span>
      </nav>

      <header className="border-b border-border">
        <div className="flex flex-col gap-6 pb-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            <div className="grid size-14 shrink-0 place-items-center rounded-lg border border-input bg-muted text-xl font-semibold text-foreground sm:size-16" aria-hidden="true">
              {(company.shortName ?? company.name).slice(0, 1)}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{company.name}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>{company.industry}</span>
                <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{company.city}</span>
                {company.size ? <span>{company.size}</span> : null}
                {company.claimedStatus === "claimed" ? <span className="inline-flex items-center gap-1 text-primary-deep"><BadgeCheck className="size-3.5" />企业已认证</span> : null}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-5 border-t border-border pt-5 sm:justify-start lg:shrink-0 lg:justify-end lg:border-0 lg:pt-0">
            <div>
              <CompanyRating score={displayScore} prominent />
              <Link href={`/company/${company.id}/reviews`} className="mt-1 block text-sm text-muted-foreground hover:text-foreground hover:underline">{reviewCount.toLocaleString()} 条公开评价</Link>
            </div>
            <WebButton asChild variant="primary"><Link href={`/submit/review?companyId=${encodeURIComponent(company.id)}`}><PenLine className="size-4" aria-hidden="true" />写评价</Link></WebButton>
          </div>
        </div>
        <p className="inline-flex items-center gap-1.5 pb-5 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0" aria-hidden="true" />匿名评价 · 人工审核 · {company.verifiedIdentityCount ?? 0} 位验证贡献者</p>
        <nav className="flex gap-8 overflow-x-auto" aria-label="公司信息导航">
          {[
            ["概览", `/company/${company.id}`],
            ["评价", `/company/${company.id}/reviews`],
            ["评分", `/company/${company.id}/ratings`],
            ["承诺", `/company/${company.id}/promises`],
          ].map(([label, href]) => (
            <Link key={href} href={href} aria-current={label === "概览" ? "page" : undefined} className={`inline-flex min-h-12 shrink-0 items-center border-b-2 px-1 text-sm font-semibold ${label === "概览" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mt-8"><CompanyDecisionInsights company={company} /></div>

      <div className="mt-8 grid gap-8 min-[1200px]:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <h2 className="mb-5 text-xl font-semibold">评价概览</h2>
          {mappedReviews.length === 0 ? (
            <div className="border-y border-border py-10">
              <h3 className="text-lg font-semibold">暂无评价</h3>
              <p className="mt-2 text-sm text-muted-foreground">样本正在积累中。评价审核通过后公开展示，暂无评分不代表负面评价。</p>
            </div>
          ) : <div data-testid="company-review-feed" className="min-w-0"><CompanyReviewFeed companyId={company.id} reviews={mappedReviews} reviewCount={company.reviewCount ?? mappedReviews.length} previewLimit={1} /></div>}
          <div className="mt-8">
            <DepartmentInsights insights={departmentInsights} />
            <PromiseRecords companyId={company.id} />
            <SentimentTrend companyId={company.id} companyName={company.name} />
          </div>
        </div>
        <CompanyEvidenceRail company={company} />
      </div>

    </section>
  )
}
