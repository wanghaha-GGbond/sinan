import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { notFound } from "next/navigation"

import { CompanyReviewFeed } from "@/components/company/company-review-feed"
import { EmptyState } from "@/components/common/state-blocks"
import { ErrorState } from "@/components/common/error-state"
import { WebButton } from "@/components/ui/web-button"
import { mapPublicReview } from "@/lib/review-mappers"
import { getPublicCompanyDetail, getPublicCompanyReviews } from "@/lib/server/public-company-data"

export default async function CompanyReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let company: Awaited<ReturnType<typeof getPublicCompanyDetail>>
  let reviews: Awaited<ReturnType<typeof getPublicCompanyReviews>>
  try {
    ;[company, reviews] = await Promise.all([
      getPublicCompanyDetail(id),
      getPublicCompanyReviews(id),
    ])
  } catch {
    return <ErrorState title="评价暂时不可用" message="真实评价加载失败，请稍后重试。" />
  }
  if (!company) notFound()
  const mappedReviews = reviews.map(mapPublicReview)

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <WebButton asChild variant="ghost">
            <Link href={`/company/${company.id}`}>
            <ChevronLeft />
            返回公司页
            </Link>
          </WebButton>
          <p className="text-sm text-muted-foreground">{company.name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">公司评价阅读区</h1>
          <p className="mt-3 text-muted-foreground">高赞真实体验、低分体验与风险评价统一按匿名保护规则展示。</p>
        </div>
        <WebButton asChild><Link href="/submit/review">发布评价</Link></WebButton>
      </div>
      {mappedReviews.length === 0 ? (
        <EmptyState />
      ) : (
        <CompanyReviewFeed companyId={company.id} reviews={mappedReviews} />
      )}
    </section>
  )
}
