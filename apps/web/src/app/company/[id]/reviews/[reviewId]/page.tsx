import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { notFound } from "next/navigation"

import { ReviewCard } from "@/components/review/review-card"
import { ReviewDiscussionSection } from "@/components/review/review-discussion-section"
import { Card, CardContent } from "@/components/ui/card"
import { SolidButton } from "@/components/ui/solid-button"
import { getCompany, getCompanyReview, getReviewDiscussions } from "@/lib/mock-data"

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string; reviewId: string }>
}) {
  const { id, reviewId } = await params
  const company = getCompany(id)
  const review = getCompanyReview(id, reviewId)

  if (!review) {
    notFound()
  }
  const currentIndex = company.reviews.findIndex((item) => item.id === review.id)
  const prevReview = currentIndex > 0 ? company.reviews[currentIndex - 1] : null
  const nextReview = currentIndex < company.reviews.length - 1 ? company.reviews[currentIndex + 1] : null
  const related = company.reviews.filter((item) => item.id !== review.id).slice(0, 3)
  const discussions = getReviewDiscussions(review.id)

  return (
    <section className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-4 py-8 pb-24 sm:px-6">
      <div className="glass-panel sticky top-12 z-30 flex items-center gap-3 rounded-2xl p-3">
        <SolidButton asChild variant="ghost">
          <Link href={`/company/${id}`}>
          <ChevronLeft />
          返回公司评价流
          </Link>
        </SolidButton>
        <p className="text-sm text-muted-foreground">
          {company.shortName} · {company.industry} · {company.city}
        </p>
      </div>

      {company.vibeTag ? (
        <Card className="solid-card-subtle border border-border/60">
          <CardContent className="p-4 text-sm text-[#334155]">
            这家公司当前体感标签：<span className="font-semibold text-foreground">{company.vibeTag.name}</span>
          </CardContent>
        </Card>
      ) : null}

      <ReviewCard review={review} companyId={id} expanded showDetailLink={false} />

      <Card className="solid-card-subtle border border-border/60">
        <CardContent className="p-4 text-sm text-[#475569]">
          这条评价已帮助 <span className="font-semibold text-[#0F172A]">{review.helpful}</span>{" "}
          位后来者
        </CardContent>
      </Card>

      <ReviewDiscussionSection reviewId={review.id} companyId={company.id} initialItems={discussions} />

      <div className="grid gap-3 sm:grid-cols-2">
        {prevReview ? (
          <SolidButton asChild variant="secondary">
            <Link href={`/company/${id}/reviews/${prevReview.id}`}>
            <ChevronLeft />
            上一条评价
            </Link>
          </SolidButton>
        ) : (
          <SolidButton variant="secondary" disabled>
            <ChevronLeft />
            上一条评价
          </SolidButton>
        )}
        {nextReview ? (
          <SolidButton asChild variant="secondary">
            <Link href={`/company/${id}/reviews/${nextReview.id}`}>
            下一条评价
            <ChevronRight />
            </Link>
          </SolidButton>
        ) : (
          <SolidButton variant="secondary" disabled>
            下一条评价
            <ChevronRight />
          </SolidButton>
        )}
      </div>

      <Card className="solid-card-subtle border border-border/60">
        <CardContent className="space-y-3 p-4">
          <h2 className="text-base font-semibold text-foreground">继续看这家公司</h2>
          {related.map((item) => (
            <Link
              key={item.id}
              href={`/company/${id}/reviews/${item.id}`}
              className="block rounded-xl border border-[#E2E8F0] p-3 hover:bg-[#F8FAFC]"
            >
              <p className="font-medium text-[#0F172A]">
                {Math.round(item.score)} 分 · {item.shortComment}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                {item.jobCategory} · 有用 {item.helpful}
              </p>
            </Link>
          ))}
          <SolidButton asChild><Link href={`/company/${id}`}>继续看这家公司</Link></SolidButton>
        </CardContent>
      </Card>

      <p className="text-xs text-[#64748B]">
        匿名安全提示：请勿在评价中发布姓名、联系方式、精确组织信息。司南优先保护匿名与事实表达。
      </p>

      <div className="glass-strong fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 p-3 sm:hidden">
        <SolidButton asChild className="w-full"><Link href={`/company/${id}`}>继续看这家公司</Link></SolidButton>
      </div>
    </section>
  )
}
