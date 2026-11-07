import Link from "next/link"
import { notFound } from "next/navigation"

import { CompanyReviewFeed } from "@/components/company/company-review-feed"
import { CompanyPageHeader } from "@/components/company/company-page-header"
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
    <section className="min-h-[calc(100vh-160px)] bg-muted px-4 py-4 sm:px-8 sm:py-6"><div className="mx-auto w-full max-w-page">
      <CompanyPageHeader company={company} active="评价" />
      <div className="mt-6 rounded-xl border border-border bg-card p-5 sm:p-7">
      {mappedReviews.length === 0 ? (
        <div className="py-10 text-center"><h2 className="text-lg font-semibold">还没有公开评价</h2><p className="mt-2 text-sm text-muted-foreground">分享你在{company.name}的工作经历。</p><WebButton asChild className="mt-5"><Link href={`/submit/review?companyId=${encodeURIComponent(company.id)}`}>写第一条评价</Link></WebButton></div>
      ) : (
        <CompanyReviewFeed companyId={company.id} reviews={mappedReviews} />
      )}
      </div></div></section>
  )
}
