"use client"

import { useState } from "react"
import { MessageCircle, Heart, Repeat2, BarChart3 } from "lucide-react"

import { Textarea } from "@/components/ui/textarea"
import { getDiscussionReplies } from "@/lib/mock-data"
import { avatarColor, avatarInitial } from "@/lib/avatar"
import { ReviewDiscussionReplyList } from "./review-discussion-reply-list"
import type { ReviewDiscussionItem, ReplyItem } from "@/lib/types"

// ── X-style action bar ────────────────────────────────────────────────────

function ActionBar({
  usefulCount,
  isUseful,
  replyCount,
  onUseful,
  onReply,
}: {
  usefulCount: number
  isUseful: boolean
  replyCount: number
  onUseful: () => void
  onReply: () => void
}) {
  return (
    <div className="mt-0.5 flex items-center gap-0 -ml-2 max-w-[425px] justify-between">
      {/* Reply — opens composer to write a new reply */}
      <button
        onClick={onReply}
        className="group flex items-center gap-1 rounded-full px-2 py-1.5 transition"
      >
        <span className="flex size-8 items-center justify-center rounded-full transition group-hover:bg-[#DFF8EC]/60">
          <MessageCircle className="size-[18px] text-[#6B7280] group-hover:text-[#19C37D]" />
        </span>
        <span className="text-[13px] tabular-nums text-[#6B7280] group-hover:text-[#19C37D]">
          {replyCount > 0 ? replyCount : ""}
        </span>
      </button>

      {/* Useful — heart */}
      <button
        onClick={onUseful}
        className="group flex items-center gap-1 rounded-full px-2 py-1.5 transition"
      >
        <span
          className={`flex size-8 items-center justify-center rounded-full transition ${
            isUseful
              ? "text-[#F91880]"
              : "text-[#6B7280] group-hover:bg-[#FCE7F3]/60 group-hover:text-[#F91880]"
          }`}
        >
          <Heart className="size-[18px]" fill={isUseful ? "currentColor" : "none"} />
        </span>
        <span
          className={`text-[13px] tabular-nums ${
            isUseful ? "text-[#F91880]" : "text-[#6B7280] group-hover:text-[#F91880]"
          }`}
        >
          {usefulCount > 0 ? usefulCount : ""}
        </span>
      </button>

      <button className="group flex items-center rounded-full px-2 py-1.5 transition">
        <span className="flex size-8 items-center justify-center rounded-full transition group-hover:bg-[#DFF8EC]/60">
          <Repeat2 className="size-[18px] text-[#6B7280] group-hover:text-[#19C37D]" />
        </span>
      </button>
      <button className="group flex items-center rounded-full px-2 py-1.5 transition">
        <span className="flex size-8 items-center justify-center rounded-full transition group-hover:bg-[#DFF8EC]/60">
          <BarChart3 className="size-[18px] text-[#6B7280] group-hover:text-[#19C37D]" />
        </span>
      </button>
    </div>
  )
}

// ── Inline Reply Composer (inside a comment) ─────────────────────────────

function InlineReplyComposer({
  onSubmit,
  onCancel,
}: {
  onSubmit: (content: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState("")

  return (
    <div className="flex gap-2.5 border-t border-[#EFF1F2] px-4 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#DFF8EC] text-xs font-bold text-[#07563A]">
        我
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="写下你的回复..."
          maxLength={300}
          rows={2}
          className="min-h-0 resize-none rounded-xl border-none bg-transparent p-0 text-[15px] leading-5 text-[#0F1419] placeholder:text-[#536471] focus-visible:ring-0"
          autoFocus
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!text.trim()) return
              onSubmit(text.trim())
            }}
            disabled={!text.trim()}
            className="rounded-full bg-[#19C37D] px-4 py-1.5 text-[15px] font-bold text-white transition hover:bg-[#0E8F5F] disabled:opacity-50"
          >
            回复
          </button>
          <button onClick={onCancel} className="text-[13px] text-[#536471] hover:text-[#0F1419]">
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Comment ──────────────────────────────────────────────────────────

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
  const [usefulCount, setUsefulCount] = useState(item.usefulCount)
  const [showReplies, setShowReplies] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [replies, setReplies] = useState<ReplyItem[]>([])

  const statusText = getStatusText(item)
  const isPublic = item.status === "visible" || item.status === "limited_visible"
  const displayContent =
    item.status === "limited_visible" && item.maskedContent
      ? item.maskedContent
      : item.content
  const colors = avatarColor(item.authorLabel)
  const replyCount = replies.length > 0 ? replies.length : (item.replyCount ?? 0)

  function loadReplies() {
    if (!showReplies) setReplies(getDiscussionReplies(item.id))
    setShowReplies(!showReplies)
  }

  function handleNewReply(content: string) {
    const newReply: ReplyItem = {
      id: `reply-direct-${Date.now()}`,
      discussionId: item.id,
      authorLabel: "菠萝探险家",
      authorRole: "anonymous",
      content,
      createdAt: "刚刚",
      usefulCount: 0,
    }
    setReplies((prev) => [...prev, newReply])
    setShowReplies(true)
    setShowComposer(false)
  }

  return (
    <div className="border-b border-[#EFF1F2]">
      <div className="flex gap-3 px-4 py-3 transition hover:bg-[#F7F9F9]/50">
        <div className="flex shrink-0 flex-col items-center">
          <div
            className="flex size-10 items-center justify-center rounded-full text-sm font-bold transition hover:brightness-95"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {avatarInitial(item.authorLabel)}
          </div>
          {showReplies && replies.length > 0 && (
            <div className="mt-1 w-0.5 grow rounded-full bg-[#CFD9DE]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="cursor-pointer text-[15px] font-bold leading-5 text-[#0F1419] hover:underline">
              {item.authorLabel}
            </span>
            <span className="text-[15px] leading-5 text-[#536471]">
              @{item.authorLabel.replace(/\s/g, "").toLowerCase()}
            </span>
            <span className="text-[15px] leading-5 text-[#536471]">·</span>
            <span className="text-[15px] leading-5 text-[#536471]">{item.createdAt}</span>
            {statusText ? (
              <>
                <span className="text-[15px] leading-5 text-[#536471]">·</span>
                <span className="text-[13px] font-medium text-[#07563A]">{statusText}</span>
              </>
            ) : null}
          </div>

          <p className="mt-0.5 text-[15px] leading-5 text-[#0F1419]">{displayContent}</p>

          {item.tags && item.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-[#F7F9F9] px-3 py-0.5 text-[13px] leading-5 text-[#1D9BF0]">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {isPublic && (
            <ActionBar
              usefulCount={usefulCount}
              isUseful={isUseful}
              replyCount={replyCount}
              onUseful={() => {
                setUsefulCount((v) => v + (isUseful ? -1 : 1))
                setIsUseful(!isUseful)
              }}
              onReply={() => setShowComposer(true)}
            />
          )}

          {/* "查看 N 条回复" — expand existing thread */}
          {!showReplies && replyCount > 0 && (
            <button
              onClick={loadReplies}
              className="mt-0.5 flex items-center gap-2 text-[15px] leading-5 text-[#1D9BF0] hover:underline"
            >
              <div className="mr-2 h-4 w-8 border-l-2 border-b-2 border-[#CFD9DE] rounded-bl-xl" />
              查看 {replyCount} 条回复
            </button>
          )}
        </div>
      </div>

      {/* Inline composer for writing a new reply */}
      {showComposer && (
        <InlineReplyComposer
          onSubmit={handleNewReply}
          onCancel={() => setShowComposer(false)}
        />
      )}

      {/* Existing reply thread */}
      {showReplies && replies.length > 0 && (
        <div className="ml-[52px]">
          <ReviewDiscussionReplyList
            discussionId={item.id}
            replies={replies}
          />
        </div>
      )}
    </div>
  )
}
