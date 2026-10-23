"use client"

import Link from "next/link"
import { ChevronDown, SlidersHorizontal } from "lucide-react"
import { useMemo, useState } from "react"

import { EmptyState } from "@/components/common/state-blocks"
import { ReviewCard } from "@/components/review/review-card"
import { Badge } from "@/components/ui/badge"
import type { Review } from "@/lib/types"

const tabs = ["全部", "高赞", "最新", "低分", "薪资"] as const
type FeedTab = (typeof tabs)[number]

function byTab(reviews: Review[], tab: FeedTab) {
  if (tab === "高赞") return [...reviews].sort((a, b) => b.helpful - a.helpful)
  if (tab === "最新") return [...reviews].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  if (tab === "低分") return [...reviews].filter((review) => review.score <= 6.5)
  if (tab === "薪资") {
    return [...reviews].filter((review) => /薪资|调薪|奖金|兑现/.test(review.content + review.shortComment))
  }
  return reviews
}

export function CompanyReviewFeed({ companyId, reviews, reviewCount, previewLimit }: { companyId: string; reviews: Review[]; reviewCount?: number; previewLimit?: number }) {
  const [selectedTag, setSelectedTag] = useState<string>("")
  const [activeTab, setActiveTab] = useState<FeedTab>("全部")
  const [showMoreFilters, setShowMoreFilters] = useState(false)
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
  const visibleReviews = previewLimit ? filteredReviews.slice(0, previewLimit) : filteredReviews

  const filterLabels = ["职位级别", "部门", "工作年限", "好评度"]

  return (
    <div className="min-w-0 border-y border-border">
      <div className="flex flex-wrap items-center gap-2 border-b border-border py-3">
        <div className="mr-1 flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
          筛选评价
        </div>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted-hover disabled:opacity-50"
            aria-label="更多筛选"
            aria-expanded={showMoreFilters}
            onClick={() => setShowMoreFilters((current) => !current)}
          >
            更多筛选
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </button>
        <button
          type="button"
          className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-transparent px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => setActiveTab("最新")}
        >
          最新排序
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      {showMoreFilters ? (
        <div className="flex flex-wrap gap-2 py-3" aria-label="评价主题筛选">
          {filterLabels.map((label) => (
            <button key={label} type="button" disabled title="此筛选暂未开放" className="min-h-11 rounded-lg border border-border px-3 text-sm text-muted-foreground opacity-50">{label}</button>
          ))}
          {tags.length === 0 ? <p className="text-sm text-muted-foreground">暂无主题标签</p> : null}
          {tags.map(([tag]) => (
            <button
              key={tag}
              type="button"
              data-testid={`review-filter-${tag}`}
              onClick={() => setSelectedTag(tag)}
              aria-pressed={selectedTag === tag}
              className={`min-h-11 shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedTag === tag
                  ? "border-primary-surface-border bg-primary-tint text-primary-deep"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      ) : null}

      {selectedTag ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>正在看：#{selectedTag}</span>
          <button
            type="button"
            data-testid="review-filter-clear"
            className="min-h-11 px-2 font-medium text-primary-hover"
            onClick={() => setSelectedTag("")}
          >
            清除
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3">
        <p className="text-sm text-muted-foreground">{(reviewCount ?? filteredReviews.length).toLocaleString()} 条评价</p>
        <div className="flex flex-wrap items-center" aria-label="评价分类">
          {tabs.map((tab) => (
            <button key={tab} type="button" data-testid={`review-tab-${tab}`} aria-pressed={activeTab === tab} className={`min-h-11 min-w-11 rounded-lg px-2 text-sm ${activeTab === tab ? "bg-primary-tint font-semibold text-primary-deep" : "text-muted-foreground hover:bg-muted-hover"}`} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </div>
      </div>

      {filteredReviews.length === 0 ? (
        <EmptyState
          title="这个分类下还没有评价。"
          description="成为第一个补上这段经历的人。"
        />
      ) : (
        visibleReviews.map((review) => (
          <ReviewCard key={review.id} review={review} companyId={companyId} compact preview={Boolean(previewLimit)} className="rounded-none border-0 border-b border-border px-0 py-6 shadow-none last:border-b-0" />
        ))
      )}

      <div className="border-t border-border py-3 text-sm text-muted-foreground">
        {previewLimit ? (
          <Link href={`/company/${companyId}/reviews`} className="flex min-h-11 items-center justify-center gap-1 font-medium text-foreground hover:text-primary-hover">
            查看全部 {(reviewCount ?? filteredReviews.length).toLocaleString()} 条评价
            <ChevronDown className="size-4" aria-hidden="true" />
          </Link>
        ) : filteredReviews.length > 3 ? "继续下滑，看更多过来人评价" : "已经看完这家公司的当前评价"}
      </div>
      <Badge variant="outline" className="mb-5 min-h-7 w-fit border-border bg-muted text-muted-foreground">
        匿名评价这家公司
      </Badge>
    </div>
  )
}
