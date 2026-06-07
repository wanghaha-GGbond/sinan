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
    <div className="mt-0.5 flex items-center gap-0 -ml-2 max-w-form justify-between">
      {/* Reply — opens composer to write a new reply */}
      <button
        onClick={onReply}
        className="group flex items-center gap-1 rounded-full px-2 py-1.5 transition"
      >
        <span className="flex size-8 items-center justify-center rounded-full transition group-hover:bg-secondary/60">
          <MessageCircle className="size-[18px] text-muted-foreground group-hover:text-primary" />
        </span>
        <span className="text-[13px] tabular-nums text-muted-foreground group-hover:text-primary">
          {replyCount > 0 ? replyCount : ""}
        </span>
      </button>

      {/* Useful — heart */}
      <button
        onClick={onUseful}
        aria-pressed={isUseful}
        aria-label={isUseful ? "取消有用" : "标记有用"}
        className="group flex min-h-11 items-center gap-1 rounded-full px-2 py-1.5 transition"
      >
        <span
          className={`flex size-8 items-center justify-center rounded-full transition ${
            isUseful
              ? "text-[var(--tw-pink)]"
              : "text-muted-foreground group-hover:bg-[var(--tw-pink-surface)]/60 group-hover:text-[var(--tw-pink)]"
          }`}
        >
          <Heart className="size-[18px]" fill={isUseful ? "currentColor" : "none"} />
        </span>
        <span
          className={`text-[13px] tabular-nums ${
            isUseful ? "text-[var(--tw-pink)]" : "text-muted-foreground group-hover:text-[var(--tw-pink)]"
          }`}
        >
          {usefulCount > 0 ? usefulCount : ""}
        </span>
      </button>

      <button aria-label="转发讨论" className="group flex min-h-11 items-center rounded-full px-2 py-1.5 transition">
        <span className="flex size-8 items-center justify-center rounded-full transition group-hover:bg-secondary/60">
          <Repeat2 className="size-[18px] text-muted-foreground group-hover:text-primary" />
        </span>
      </button>
      <button aria-label="查看分析" className="group flex min-h-11 items-center rounded-full px-2 py-1.5 transition">
        <span className="flex size-8 items-center justify-center rounded-full transition group-hover:bg-secondary/60">
          <BarChart3 className="size-[18px] text-muted-foreground group-hover:text-primary" />
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
    <div className="flex gap-2.5 border-t border-tw-mute px-4 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
        我
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="写下你的回复..."
          maxLength={300}
          rows={2}
          className="min-h-0 resize-none rounded-xl border-none bg-transparent p-0 text-[15px] leading-5 text-[var(--tw-ink)] placeholder:text-[var(--tw-tertiary)] focus-visible:ring-0"
          autoFocus
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!text.trim()) return
              onSubmit(text.trim())
            }}
            disabled={!text.trim()}
            className="rounded-full bg-primary-hover px-4 py-1.5 text-[15px] font-bold text-primary-foreground transition hover:bg-primary-deep disabled:opacity-50"
          >
            回复
          </button>
          <button onClick={onCancel} className="min-h-11 px-3 text-[13px] text-[var(--tw-tertiary)] hover:text-[var(--tw-ink)]">
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
    <div className="border-b border-tw-mute">
      <div className="flex gap-3 px-4 py-3 transition hover:bg-[var(--tw-surface)]/50">
        <div className="flex shrink-0 flex-col items-center">
          <div
            className="flex size-10 items-center justify-center rounded-full text-sm font-bold transition hover:brightness-95"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {avatarInitial(item.authorLabel)}
          </div>
          {showReplies && replies.length > 0 && (
            <div className="mt-1 w-0.5 grow rounded-full bg-[var(--tw-blue-soft)]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[15px] leading-5 text-[var(--tw-tertiary)]">
            <span className="cursor-pointer font-bold text-[var(--tw-ink)] hover:underline">
              {item.authorLabel}
            </span>
            <span>@{item.authorLabel.replace(/\s/g, "").toLowerCase()}</span>
            <span>{item.createdAt}</span>
            {statusText ? (
              <span className="text-[13px] font-medium text-secondary-foreground">{statusText}</span>
            ) : null}
          </div>

          <p className="mt-0.5 text-[15px] leading-5 text-[var(--tw-ink)]">{displayContent}</p>

          {item.tags && item.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-[var(--tw-surface)] px-3 py-0.5 text-[13px] leading-5 text-[var(--tw-blue)]">
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
              className="mt-0.5 flex items-center gap-2 pl-3 text-[15px] leading-5 text-[var(--tw-blue)] hover:underline"
            >
              <MessageCircle className="size-3.5" />
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
