"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { MessageCircle, ThumbsUp } from "lucide-react"
import { toast } from "sonner"

import { ScoreChip } from "@/components/ui/score-chip"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"
import { ReportReviewButton } from "@/components/review/report-review-button"
import type { Review } from "@/lib/types"
import { isReviewUseful, toggleReviewUseful } from "@/lib/useful-storage"

function tagTone(tag: string): "risk" | "positive" | "neutral" {
  if (/(风险|慎重|压力|加班|不确定|波动|限制|慢)/.test(tag)) {
    return "risk"
  }
  if (/(成熟|稳定|清晰|不错|含金量|透明|成长|高)/.test(tag)) {
    return "positive"
  }
  return "neutral"
}

export function ReviewCard({
  review,
  companyId,
  expanded = false,
  showDetailLink = true,
}: {
  review: Review
  companyId?: string
  expanded?: boolean
  showDetailLink?: boolean
}) {
  const [liked, setLiked] = useState(() => isReviewUseful(review.id))
  const [isExpanded, setIsExpanded] = useState(expanded)
  const isLong = useMemo(() => review.content.replace(/\s/g, "").length > 180, [review.content])
  const likeCount = review.helpful + (liked ? 1 : 0)
  const detailHref = companyId ? `/company/${companyId}/reviews/${review.id}` : undefined

  return (
    <SolidCard variant="subtle" className="border border-border/60 p-5 transition-transform hover:-translate-y-0.5">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
              <span>匿名评价者</span>
              <span>L{review.trustLevel}</span>
              <span>{review.employmentStatus}</span>
              {review.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  ✅ 已验证员工
                </span>
              )}
            </p>
            {detailHref ? (
              <Link href={detailHref} className="block text-base font-semibold leading-6 text-foreground hover:text-primary-hover">
                {review.shortComment}
              </Link>
            ) : (
              <h3 className="text-base font-semibold leading-6 text-foreground">{review.shortComment}</h3>
            )}
          </div>
          <ScoreChip score={review.score} compact className="shrink-0" />
        </div>

        <div className="space-y-2">
          {detailHref ? (
            <Link href={detailHref} className="block">
              <p
                className={`max-w-prose whitespace-pre-line text-sm leading-7 text-[#334155] ${
                  isLong && !isExpanded ? "line-clamp-5" : ""
                }`}
              >
                {review.content}
              </p>
            </Link>
          ) : (
            <p
              className={`whitespace-pre-line text-sm leading-7 text-[#334155] ${
                isLong && !isExpanded ? "line-clamp-5" : ""
              }`}
            >
              {review.content}
            </p>
          )}
          {isLong ? (
            <button
              type="button"
              data-testid={`toggle-expand-${review.id}`}
              className="text-sm font-medium text-primary-hover hover:text-secondary-foreground"
              onClick={() => setIsExpanded((prev) => !prev)}
            >
              {isExpanded ? "收起" : "展开全文"}
            </button>
          ) : null}
          {showDetailLink && detailHref ? (
            <Link href={detailHref} className="inline-block text-sm font-medium text-primary-hover hover:text-secondary-foreground">
              阅读全文
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {review.tags.map((tag) => (
            <TagPill key={tag} tone={tagTone(tag)}>
              #{tag}
            </TagPill>
          ))}
        </div>

        <p className="flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          <span>{review.jobCategory}</span>
          <span>{review.city}</span>
          <span>{review.createdAt}</span>
        </p>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <SolidButton
            type="button"
            variant="secondary"
            size="sm"
            aria-pressed={liked}
            data-testid={`like-review-${review.id}`}
            className="rounded-full aria-pressed:bg-secondary aria-pressed:text-secondary-foreground aria-pressed:shadow-[0_3px_0_rgba(14,143,95,0.22)]"
            onClick={() => {
              const next = toggleReviewUseful(review.id)
              setLiked(next)
              toast.success(next ? "已记录,你帮后来者筛出了一条有用评价" : "已取消有用标记")
            }}
          >
            <ThumbsUp className="size-4" />
            有用 {likeCount}
          </SolidButton>
          {detailHref ? (
            <SolidButton asChild variant="secondary" size="sm" className="rounded-full">
              <Link href={`${detailHref}#followups`}>
                <MessageCircle className="size-4" />
                回复 {review.commentCount}
              </Link>
            </SolidButton>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1">
              <MessageCircle className="size-4" />
              回复 {review.commentCount}
            </span>
          )}
          <ReportReviewButton reviewId={review.id} />
        </div>
      </div>
    </SolidCard>
  )
}
