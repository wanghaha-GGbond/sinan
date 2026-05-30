"use client"

import { useState } from "react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"
import type { ReviewDiscussionItem } from "@/lib/types"

const typeTone = {
  question: "risk",
  supplement: "match",
} as const

const typeLabel = {
  question: "追问",
  supplement: "补充",
} as const

function getStatusText(item: ReviewDiscussionItem) {
  if (item.status === "local_pending") return "本地已保存"
  if (item.status === "pending_review") return "审核中，仅你可见"
  if (item.status === "limited_visible") return "部分内容已打码"
  if (item.status === "rejected") return "未通过审核"
  if (item.status === "hidden") return "该内容已被隐藏"
  if (item.status === "deleted_by_author") return "你已删除这条内容"
  return ""
}

export function ReviewDiscussionCard({ item }: { item: ReviewDiscussionItem }) {
  const [isUseful, setIsUseful] = useState(Boolean(item.isUsefulByCurrentUser))
  const [count, setCount] = useState(item.usefulCount)

  function toggleUseful() {
    setCount((value) => value + (isUseful ? -1 : 1))
    setIsUseful(!isUseful)
  }
  const statusText = getStatusText(item)
  const isPublic = item.status === "visible" || item.status === "limited_visible"
  const displayContent = item.status === "limited_visible" && item.maskedContent ? item.maskedContent : item.content

  return (
    <SolidCard data-testid="discussion-card" variant="subtle" className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
        <TagPill data-testid={`discussion-type-${item.type}`} tone={typeTone[item.type]}>
          {typeLabel[item.type]}
        </TagPill>
        <span className="font-medium text-[#1F2937]">{item.authorLabel}</span>
        <span>·</span>
        <span>{item.createdAt}</span>
        {statusText ? (
          <>
            <span>·</span>
            <span className="font-medium text-[#07563A]">{statusText}</span>
          </>
        ) : null}
      </div>

      <p className="text-sm leading-7 text-[#1F2937]">{displayContent}</p>

      {item.tags && item.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {item.tags.slice(0, 4).map((tag) => (
            <TagPill key={tag} tone="neutral">
              {tag}
            </TagPill>
          ))}
        </div>
      ) : null}

      {isPublic ? (
        <SolidButton
          aria-pressed={isUseful}
          className={isUseful ? "bg-[#DFF8EC] text-[#07563A] shadow-[0_3px_0_rgba(14,143,95,0.22)]" : ""}
          data-count={count}
          data-testid="discussion-useful-button"
          onClick={toggleUseful}
          size="sm"
          type="button"
          variant="secondary"
        >
          有用 {count}
        </SolidButton>
      ) : null}
    </SolidCard>
  )
}
