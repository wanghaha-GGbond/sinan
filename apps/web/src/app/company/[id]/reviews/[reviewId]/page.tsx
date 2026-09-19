import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { notFound } from "next/navigation"

import { ReviewCard } from "@/components/review/review-card"
import { ErrorState } from "@/components/common/error-state"
import { Card, CardContent } from "@/components/ui/card"
import { WebButton } from "@/components/ui/web-button"
import { mapPublicReview } from "@/lib/review-mappers"
import {
  getPublicCompanyDetail,
  getPublicCompanyReviews,
  getPublicReviewDetail,
} from "@/lib/server/public-company-data"

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string; reviewId: string }>
}) {
  const { id, reviewId } = await params
  let company: Awaited<ReturnType<typeof getPublicCompanyDetail>>
  let reviewItem: Awaited<ReturnType<typeof getPublicReviewDetail>>
  let reviewItems: Awaited<ReturnType<typeof getPublicCompanyReviews>>
  try {
    ;[company, reviewItem, reviewItems] = await Promise.all([
      getPublicCompanyDetail(id),
      getPublicReviewDetail(id, reviewId),
      getPublicCompanyReviews(id),
    ])
  } catch {
    return <ErrorState title="评价暂时不可用" message="真实评价加载失败，请稍后重试。" />
  }
  if (!company) notFound()
  if (!reviewItem) notFound()
  const reviews = reviewItems.map(mapPublicReview)
  const review = mapPublicReview(reviewItem)
  const currentIndex = reviews.findIndex((item) => item.id === review.id)
  const prevReview = currentIndex > 0 ? reviews[currentIndex - 1] : null
  const nextReview = currentIndex < reviews.length - 1 ? reviews[currentIndex + 1] : null
  const related = reviews.filter((item) => item.id !== review.id).slice(0, 3)

  return (
    <section className="mx-auto flex w-full max-w-section flex-col gap-5 px-4 py-8 pb-24 sm:px-6">
      <div className="glass-panel sticky top-12 z-sticky flex items-center gap-3 rounded-2xl p-3">
        <WebButton asChild variant="ghost">
          <Link href={`/company/${id}`}>
          <ChevronLeft />
          返回公司评价流
          </Link>
        </WebButton>
        <p className="flex flex-wrap gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
          <span>{company.shortName}</span>
          <span>{company.industry}</span>
          <span>{company.city}</span>
        </p>
      </div>

      <ReviewCard review={review} companyId={id} expanded showDetailLink={false} />

      <Card className="web-surface web-surface-base border border-border/60">
        <CardContent className="p-4 text-sm text-[var(--tw-secondary)]">
          这条评价已帮助 <span className="font-semibold text-[var(--tw-ink-soft)]">{review.helpful}</span>{" "}
          位后来者
        </CardContent>
      </Card>

      <Card id="followups" className="border border-border/60">
        <CardContent className="p-4 text-sm text-muted-foreground">
          首发 Beta 暂不开放公开追问；你仍可举报不实或泄露身份的信息。
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {prevReview ? (
          <WebButton asChild variant="secondary">
            <Link href={`/company/${id}/reviews/${prevReview.id}`}>
            <ChevronLeft />
            上一条评价
            </Link>
          </WebButton>
        ) : (
          <WebButton variant="secondary" disabled>
            <ChevronLeft />
            上一条评价
          </WebButton>
        )}
        {nextReview ? (
          <WebButton asChild variant="secondary">
            <Link href={`/company/${id}/reviews/${nextReview.id}`}>
            下一条评价
            <ChevronRight />
            </Link>
          </WebButton>
        ) : (
          <WebButton variant="secondary" disabled>
            下一条评价
            <ChevronRight />
          </WebButton>
        )}
      </div>

      <Card className="web-surface web-surface-base border border-border/60">
        <CardContent className="space-y-3 p-4">
          <h2 className="text-base font-semibold text-foreground">继续看这家公司</h2>
          {related.map((item) => (
            <Link
              key={item.id}
              href={`/company/${id}/reviews/${item.id}`}
              className="block rounded-xl border border-tw-blue-soft p-3 hover:bg-[var(--tw-gray-50)]"
            >
              <p className="flex flex-wrap gap-x-2.5 gap-y-1 font-medium text-[var(--tw-ink-soft)]">
                <span>{Math.round(item.score)} 分</span>
                <span>{item.shortComment}</span>
              </p>
              <p className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-[var(--tw-secondary)]">
                <span>{item.jobCategory}</span>
                <span>有用 {item.helpful}</span>
              </p>
            </Link>
          ))}
          <WebButton asChild><Link href={`/company/${id}`}>继续看这家公司</Link></WebButton>
        </CardContent>
      </Card>

      <p className="text-xs text-[var(--tw-secondary)]">
        匿名安全提示：请勿在评价中发布姓名、联系方式、精确组织信息。在场优先保护匿名与事实表达。
      </p>

      <div className="glass-strong fixed inset-x-0 bottom-0 z-sticky border-t border-slate-200/70 p-3 sm:hidden">
        <WebButton asChild className="w-full"><Link href={`/company/${id}`}>继续看这家公司</Link></WebButton>
      </div>
    </section>
  )
}
