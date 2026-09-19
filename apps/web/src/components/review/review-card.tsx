"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { BadgeCheck, CircleCheck, CircleUserRound, Info, MessageCircle, Star, StarHalf, ThumbsUp, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { ScoreChip } from "@/components/ui/score-chip"
import { WebButton } from "@/components/ui/web-button"
import { WebSurface } from "@/components/ui/web-surface"
import { TagPill } from "@/components/ui/tag-pill"
import { ReportReviewButton } from "@/components/review/report-review-button"
import type { Review } from "@/lib/types"
import { toggleReviewUsefulData } from "@/lib/data/reviews"

function tagTone(tag: string): "risk" | "positive" | "neutral" {
  if (/(风险|慎重|压力|加班|不确定|波动|限制|慢)/.test(tag)) {
    return "risk"
  }
  if (/(成熟|稳定|清晰|不错|含金量|透明|成长|高)/.test(tag)) {
    return "positive"
  }
  return "neutral"
}

function ScoreStars({ score }: { score: unknown }) {
  if (typeof score !== "number") return <span className="text-muted-foreground">—</span>
  const value = Math.max(0, Math.min(5, score / 2))
  const fullStars = Math.floor(value)
  const hasHalfStar = value - fullStars >= 0.25 && value - fullStars < 0.75
  return (
    <span className="inline-flex items-center gap-0.5 text-primary" aria-label={`${value.toFixed(1)} 分（满分 5 分）`}>
      {Array.from({ length: 5 }, (_, index) => {
        if (index < fullStars) return <Star key={index} className="size-3.5" fill="currentColor" aria-hidden="true" />
        if (index === fullStars && hasHalfStar) return <StarHalf key={index} className="size-3.5" fill="currentColor" aria-hidden="true" />
        return <Star key={index} className="size-3.5" aria-hidden="true" />
      })}
    </span>
  )
}

export function ReviewCard({
  review,
  companyId,
  expanded = false,
  showDetailLink = true,
  showDiscussionLink = false,
  compact = false,
  preview = false,
  className,
}: {
  review: Review
  companyId?: string
  expanded?: boolean
  showDetailLink?: boolean
  showDiscussionLink?: boolean
  compact?: boolean
  preview?: boolean
  className?: string
}) {
  const [liked, setLiked] = useState(Boolean(review.isUsefulByCurrentUser))
  const [likeCount, setLikeCount] = useState(review.helpful)
  const [isVoting, setIsVoting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(expanded)
  const isLong = useMemo(() => review.content.replace(/\s/g, "").length > 180, [review.content])
  const detailHref = companyId ? `/company/${companyId}/reviews/${review.id}` : undefined
  const positiveTags = review.tags.filter((tag) => tagTone(tag) === "positive").slice(0, 3)
  const riskTags = review.tags.filter((tag) => tagTone(tag) === "risk").slice(0, 3)
  const contentSentences = review.content.split(/[。！？]/).map((sentence) => sentence.trim()).filter(Boolean)
  const positiveSummary = positiveTags.length > 0 ? positiveTags.join("、") : contentSentences[0]
  const riskSummary = riskTags.length > 0 ? riskTags.join("、") : contentSentences.at(-1)
  const trustLabel = review.trustLevel >= 3 ? "高级身份" : review.trustLevel === 2 ? "中等身份" : review.trustLevel === 1 ? "基础身份" : "身份未核验"

  return (
    <WebSurface tone="base" className={`p-4 sm:p-5 ${className ?? ""}`}>
      <div className="space-y-4">
        <div className={`grid gap-4 lg:items-start ${compact ? "lg:grid-cols-[15rem_minmax(0,1fr)]" : "lg:grid-cols-[15rem_minmax(0,1fr)_auto]"}`}>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
              <CircleUserRound className="size-6" strokeWidth={1.6} />
            </div>
            <div className="min-w-0">
              <span className="sr-only">匿名评价者 · L{review.trustLevel} · {review.employmentStatus}</span>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">匿名员工</p>
                {review.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-primary-deep">
                    <BadgeCheck className="size-3.5" aria-hidden="true" />已验证
                  </span>
                ) : null}
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">{trustLabel}<Info className="size-3" aria-hidden="true" /></p>
            </div>
          </div>
          <div className="min-w-0">
            {detailHref ? (
                <Link href={detailHref} className="block text-xl font-semibold leading-7 text-foreground hover:text-primary-hover">
                {review.shortComment}
              </Link>
            ) : (
              <h3 className="text-xl font-semibold leading-7 text-foreground">{review.shortComment}</h3>
            )}
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{review.role || "匿名评价者"}</span>
              <span>·</span>
              <span>{review.employmentStatus}</span>
              <span>·</span>
              <span>{review.tenure}</span>
              <span>·</span>
              <span>{review.createdAt}</span>
            </p>
          </div>
          {!compact ? <ScoreChip score={review.score} compact className="shrink-0 lg:mt-0.5" /> : null}
        </div>

        {review.questionnaire ? (
          <div className="grid grid-cols-2 gap-3 border-y border-border py-3 sm:grid-cols-5">
            {[
              ["工作节奏", review.questionnaire.stabilityScore ?? review.questionnaire.workLifeBalanceScore],
              ["成长机会", review.questionnaire.growthScore],
              ["管理", review.questionnaire.managementClarityScore],
              ["薪酬福利", review.questionnaire.salaryScore],
              ["工作与生活平衡", review.questionnaire.workLifeBalanceScore],
            ].map(([label, score]) => (
              <div key={label as string} className="border-border sm:border-r sm:last:border-r-0 sm:pr-3 sm:last:pr-0">
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold tabular-nums text-foreground">
                  <ScoreStars score={score} />
                  <span>{typeof score === "number" ? (score / 2).toFixed(1) : "—"}</span>
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {(positiveSummary || riskSummary) ? (
          <div className={`grid gap-4 border-t border-border pt-3 text-sm leading-6 text-muted-foreground ${compact && preview ? "lg:border-0 lg:pt-2" : ""}`}>
            {positiveSummary ? (
              <div>
                <p className="flex items-center gap-2 font-semibold text-foreground"><CircleCheck className="size-4 text-primary" aria-hidden="true" />优点</p>
                <p className="mt-1.5">{positiveSummary}</p>
              </div>
            ) : null}
            {riskSummary ? (
              <div>
                <p className="flex items-center gap-2 font-semibold text-foreground"><TriangleAlert className="size-4 text-risk-foreground" aria-hidden="true" />风险</p>
                <p className="mt-1.5">{riskSummary}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {!compact ? <div className="space-y-2">
          {detailHref && showDiscussionLink ? (
            <Link href={detailHref} className="block">
              <p
                className={`max-w-prose whitespace-pre-line text-sm leading-7 text-[var(--tw-slate)] ${
                  isLong && !isExpanded ? "line-clamp-5" : ""
                }`}
              >
                {review.content}
              </p>
            </Link>
          ) : (
            <p
              className={`whitespace-pre-line text-sm leading-7 text-[var(--tw-slate)] ${
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
        </div> : null}

        {!compact ? (
          <div className="flex flex-wrap gap-2">
            {review.tags.map((tag) => (
              <TagPill key={tag} tone={tagTone(tag)}>
                #{tag}
              </TagPill>
            ))}
          </div>
        ) : null}

        {!compact ? (
          <p className="flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
            <span>{review.jobCategory}</span>
            <span>{review.city}</span>
            <span>{review.createdAt}</span>
          </p>
        ) : null}

        <div className={`flex flex-wrap items-center gap-2.5 text-sm text-muted-foreground ${compact && preview ? "lg:!mt-[39px]" : ""}`}>
          <WebButton
            type="button"
            variant="secondary"
            size="sm"
            aria-pressed={liked}
            disabled={isVoting}
            data-testid={`like-review-${review.id}`}
            className="rounded-[9px] aria-pressed:border-primary-surface-border aria-pressed:bg-primary-tint aria-pressed:text-primary-deep"
            onClick={async () => {
              if (isVoting) return
              setIsVoting(true)
              const result = await toggleReviewUsefulData(review.id, !liked)
              setIsVoting(false)
              if (!result.ok) {
                toast.error(
                  result.authenticationRequired
                    ? "登录后可标记有用"
                    : result.error
                )
                return
              }
              setLiked(result.isUsefulByCurrentUser)
              setLikeCount(result.usefulCount)
              toast.success(
                result.isUsefulByCurrentUser
                  ? "已记录，你帮后来者筛出了一条有用评价"
                  : "已取消有用标记"
              )
            }}
          >
            <ThumbsUp className="size-4" />
            有用 {likeCount}
          </WebButton>
          {detailHref ? (
            <WebButton asChild variant="secondary" size="sm">
              <Link href={`${detailHref}#followups`}>
                <MessageCircle className="size-4" />
                {compact ? "补充经历" : `回复 ${review.commentCount}`}
              </Link>
            </WebButton>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1">
              <MessageCircle className="size-4" />
              回复 {review.commentCount}
            </span>
          )}
          {compact && detailHref ? (
            <WebButton asChild variant="secondary" size="sm">
              <Link href={`${detailHref}#correction`}>
                <BadgeCheck className="size-4" />
                事实纠正
              </Link>
            </WebButton>
          ) : null}
          <span className="ml-auto"><ReportReviewButton reviewId={review.id} compact={compact} /></span>
        </div>
      </div>
    </WebSurface>
  )
}
