"use client"

import { useMemo, useState } from "react"

import { ReviewDiscussionCard } from "@/components/review/review-discussion-card"
import { ReviewDiscussionComposer } from "@/components/review/review-discussion-composer"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
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

  const publicItems = useMemo(() => sortReviewDiscussions(getPublicDiscussions(items), sort), [items, sort])
  const myStatusItems = useMemo(() => getAuthorStatusDiscussions(items), [items])

  return (
    <section data-testid="review-discussion-section" id="followups" className="space-y-4">
      <SolidCard variant="subtle" className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">追问与补充</h2>
            <p className="mt-1 text-sm text-[#6B7280]">看完还有疑问，可以继续问过来人。</p>
          </div>
          <div className="flex gap-2">
            <SolidButton
              data-testid="discussion-sort-useful"
              onClick={() => setSort("useful")}
              size="sm"
              type="button"
              variant={sort === "useful" ? "dark" : "secondary"}
            >
              高赞
            </SolidButton>
            <SolidButton
              data-testid="discussion-sort-latest"
              onClick={() => setSort("latest")}
              size="sm"
              type="button"
              variant={sort === "latest" ? "dark" : "secondary"}
            >
              最新
            </SolidButton>
          </div>
        </div>

        <ReviewDiscussionComposer
          reviewId={reviewId}
          companyId={companyId}
          onSubmit={(payload) => {
            const item = createLocalDiscussion({
              reviewId,
              companyId,
              type: payload.type,
              authorRole: payload.authorRole,
              authorLabel: payload.authorLabel,
              content: payload.content,
              tags: payload.type === "question" ? ["追问"] : ["补充"],
            })
            setItems((current) => [item, ...current])
            setSort("latest")
          }}
        />
      </SolidCard>

      <div data-testid="public-discussion-list" className="space-y-3">
        {publicItems.map((item) => (
          <ReviewDiscussionCard key={item.id} item={item} />
        ))}
      </div>

      {myStatusItems.length > 0 ? (
        <div data-testid="my-discussion-status-list" className="space-y-3">
          <p className="px-1 text-xs font-semibold text-[#6B7280]">我的待处理内容</p>
          {myStatusItems.map((item) => (
            <ReviewDiscussionCard key={item.id} item={item} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
