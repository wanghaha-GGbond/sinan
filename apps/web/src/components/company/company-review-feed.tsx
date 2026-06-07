"use client"

import { useMemo, useState } from "react"

import { EmptyState } from "@/components/common/state-blocks"
import { ReviewCard } from "@/components/review/review-card"
import { Badge } from "@/components/ui/badge"
import type { Review } from "@/lib/types"

const tabs = ["全部", "高赞", "最新", "低分", "面试", "薪资"] as const
type FeedTab = (typeof tabs)[number]

function byTab(reviews: Review[], tab: FeedTab) {
  if (tab === "高赞") return [...reviews].sort((a, b) => b.helpful - a.helpful)
  if (tab === "最新") return [...reviews].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  if (tab === "低分") return [...reviews].filter((review) => review.score <= 6.5)
  if (tab === "面试") return [...reviews].filter((review) => review.employmentStatus === "面试者")
  if (tab === "薪资") {
    return [...reviews].filter((review) => /薪资|调薪|奖金|兑现/.test(review.content + review.shortComment))
  }
  return reviews
}

export function CompanyReviewFeed({ companyId, reviews }: { companyId: string; reviews: Review[] }) {
  const [selectedTag, setSelectedTag] = useState<string>("")
  const [activeTab, setActiveTab] = useState<FeedTab>("全部")
  const tags = useMemo(() => {
    const counter = new Map<string, number>()
    for (const review of reviews) {
      for (const tag of review.tags) {
        counter.set(tag, (counter.get(tag) ?? 0) + 1)
      }
    }
    return Array.from(counter.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [reviews])

  const filteredReviews = useMemo(() => {
    const fromTab = byTab(reviews, activeTab)
    if (!selectedTag) return fromTab
    return fromTab.filter((review) => review.tags.includes(selectedTag))
  }, [activeTab, reviews, selectedTag])

  return (
    <div className="grid gap-4">
      <div className="flex gap-2 overflow-x-auto rounded-full bg-muted p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            data-testid={`review-tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab
                ? "border-primary bg-primary-hover text-primary-foreground shadow-[0_3px_0_var(--primary-deep)]"
                : "border-border/60 bg-white text-[var(--tw-secondary)] hover:bg-muted"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tags.map(([tag]) => (
          <button
            key={tag}
            type="button"
            data-testid={`review-filter-${tag}`}
            onClick={() => setSelectedTag(tag)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedTag === tag
                ? "border-primary-surface-border bg-secondary text-secondary-foreground"
                : "border-border/60 bg-white text-[var(--tw-secondary)] hover:bg-muted"
            }`}
          >
            #{tag}
          </button>
        ))}
      </div>

      {selectedTag ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>正在看：#{selectedTag}</span>
          <button
            type="button"
            data-testid="review-filter-clear"
            className="font-medium text-primary-hover"
            onClick={() => setSelectedTag("")}
          >
            清除
          </button>
        </div>
      ) : null}

      {filteredReviews.length === 0 ? (
        <EmptyState
          title="这个分类下还没有评价。"
          description="成为第一个补上这段经历的人。"
        />
      ) : (
        filteredReviews.map((review) => (
          <ReviewCard key={review.id} review={review} companyId={companyId} />
        ))
      )}

      <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
        {filteredReviews.length > 3 ? "继续下滑，看更多过来人评价" : "已经看完这家公司的当前评价"}
      </div>
      <Badge variant="outline" className="w-fit border-primary-surface-border bg-secondary text-secondary-foreground">
        匿名评价这家公司
      </Badge>
    </div>
  )
}
