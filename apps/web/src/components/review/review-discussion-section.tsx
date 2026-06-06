"use client"

import { useMemo, useState } from "react"
import { MessageCircle } from "lucide-react"

import { ReviewDiscussionCard } from "@/components/review/review-discussion-card"
import { ReviewDiscussionComposer } from "@/components/review/review-discussion-composer"
import { SolidButton } from "@/components/ui/solid-button"
import { createLocalDiscussion } from "@/lib/mock-data"
import {
  getAuthorStatusDiscussions,
  getPublicDiscussions,
  sortReviewDiscussions,
  type ReviewDiscussionSort,
} from "@/lib/review-discussion-sort"
import type { ReviewDiscussionItem } from "@/lib/types"

export function ReviewDiscussionSection({
  reviewId,
  companyId,
  initialItems,
}: {
  reviewId: string
  companyId: string
  initialItems: ReviewDiscussionItem[]
}) {
  const [items, setItems] = useState(initialItems)
  const [sort, setSort] = useState<ReviewDiscussionSort>("useful")
  const [showComposer, setShowComposer] = useState(false)

  const publicItems = useMemo(
    () => sortReviewDiscussions(getPublicDiscussions(items), sort),
    [items, sort]
  )
  const myStatusItems = useMemo(() => getAuthorStatusDiscussions(items), [items])

  return (
    <section data-testid="review-discussion-section" id="followups">
      {/* Header + sort */}
      <div className="flex items-center justify-between border-b border-[#EFF1F2] px-4 py-3">
        <button
          onClick={() => setShowComposer(!showComposer)}
          className="flex items-center gap-2 text-[15px] font-bold text-[#0F1419]"
        >
          <MessageCircle className="size-5" />
          评论
          {publicItems.length > 0 && (
            <span className="text-[#536471]">{publicItems.length}</span>
          )}
        </button>
        <div className="flex gap-1">
          <SolidButton
            data-testid="discussion-sort-useful"
            onClick={() => setSort("useful")}
            size="sm"
            type="button"
            variant={sort === "useful" ? "dark" : "ghost"}
          >
            热门
          </SolidButton>
          <SolidButton
            data-testid="discussion-sort-latest"
            onClick={() => setSort("latest")}
            size="sm"
            type="button"
            variant={sort === "latest" ? "dark" : "ghost"}
          >
            最新
          </SolidButton>
        </div>
      </div>

      {/* Collapsed composer trigger */}
      {!showComposer && (
        <button
          onClick={() => setShowComposer(true)}
          className="flex w-full items-center gap-3 border-b border-[#EFF1F2] px-4 py-3 text-[15px] text-[#536471] transition hover:bg-[#F7F9F9]/50"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
            我
          </div>
          写下你的评论...
        </button>
      )}

      {/* Expanded composer */}
      {showComposer && (
        <div className="border-b border-[#EFF1F2] px-4 py-3">
          <ReviewDiscussionComposer
            reviewId={reviewId}
            companyId={companyId}
            onSubmit={(payload) => {
              const item = createLocalDiscussion({
                reviewId,
                companyId,
                type: "question",
                authorRole: "anonymous",
                authorLabel: "菠萝探险家",
                content: payload.content,
                tags: [],
              })
              setItems((current) => [item, ...current])
              setSort("latest")
              setShowComposer(false)
            }}
            onCancel={() => setShowComposer(false)}
          />
        </div>
      )}

      {/* Comment list */}
      <div data-testid="public-discussion-list">
        {publicItems.length === 0 && (
          <p className="px-4 py-8 text-center text-[15px] text-[#536471]">
            还没有评论，来写第一条吧
          </p>
        )}
        {publicItems.map((item) => (
          <ReviewDiscussionCard key={item.id} item={item} />
        ))}
      </div>

      {myStatusItems.length > 0 ? (
        <div data-testid="my-discussion-status-list" className="border-t border-[#EFF1F2] py-3">
          <p className="px-4 text-xs font-semibold text-muted-foreground">我的待处理内容</p>
          <div className="mt-2">
            {myStatusItems.map((item) => (
              <ReviewDiscussionCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
