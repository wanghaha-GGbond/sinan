"use client"

import { useState } from "react"
import { MessageCircle, Heart } from "lucide-react"

import { Textarea } from "@/components/ui/textarea"
import { avatarColor, avatarInitial } from "@/lib/avatar"
import type { ReplyItem } from "@/lib/types"

// ── X-style reply row ──────────────────────────────────────────────────────

function ReplyRow({
  reply,
  parentAuthor,
  isLast,
  onReply,
}: {
  reply: ReplyItem
  parentAuthor?: string
  isLast: boolean
  onReply: (parentId: string) => void
}) {
  const [useful, setUseful] = useState(Boolean(reply.isUsefulByCurrentUser))
  const [count, setCount] = useState(reply.usefulCount)
  const colors = avatarColor(reply.authorLabel)
  const hasNested = reply.replies && reply.replies.length > 0

  return (
    <div>
      <div className="flex gap-2.5 px-4 py-2 transition hover:bg-[#F7F9F9]/50">
        {/* Avatar + thread line */}
        <div className="flex shrink-0 flex-col items-center">
          <div
            className="flex size-8 items-center justify-center rounded-full text-xs font-bold transition hover:brightness-95"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {avatarInitial(reply.authorLabel)}
          </div>
          {/* Thread line continues down if not the last reply */}
          {!isLast && (
            <div className="mt-1 w-0.5 grow rounded-full bg-[#CFD9DE]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-baseline gap-1">
            <span className="cursor-pointer text-[15px] font-bold leading-5 text-[#0F1419] hover:underline">
              {reply.authorLabel}
            </span>
            <span className="text-[15px] leading-5 text-[#536471]">
              @{reply.authorLabel.replace(/\s/g, "").toLowerCase()}
            </span>
            {parentAuthor && (
              <>
                <span className="text-[15px] leading-5 text-[#536471]">·</span>
                <span className="text-[13px] leading-5 text-[#1D9BF0]">
                  回复 @{parentAuthor}
                </span>
              </>
            )}
            <span className="text-[15px] leading-5 text-[#536471]">·</span>
            <span className="text-[15px] leading-5 text-[#536471]">{reply.createdAt}</span>
          </div>

          {/* Content */}
          <p className="mt-0.5 text-[15px] leading-5 text-[#0F1419]">{reply.content}</p>

          {/* Actions */}
          <div className="-ml-1.5 mt-0.5 flex items-center gap-0">
            <button
              onClick={() => onReply(reply.id)}
              className="group flex items-center gap-1 rounded-full px-1.5 py-1 transition"
            >
              <span className="flex size-7 items-center justify-center rounded-full transition group-hover:bg-[#DFF8EC]/60">
                <MessageCircle className="size-[17px] text-[#6B7280] group-hover:text-[#19C37D]" />
              </span>
            </button>
            <button
              onClick={() => {
                setUseful(!useful)
                setCount((c) => c + (useful ? -1 : 1))
              }}
              className="group flex items-center gap-1 rounded-full px-1.5 py-1 transition"
            >
              <span
                className={`flex size-7 items-center justify-center rounded-full transition ${
                  useful
                    ? "text-[#F91880]"
                    : "text-[#6B7280] group-hover:bg-[#FCE7F3]/60 group-hover:text-[#F91880]"
                }`}
              >
                <Heart className="size-[17px]" fill={useful ? "currentColor" : "none"} />
              </span>
              {count > 0 && (
                <span
                  className={`text-[13px] tabular-nums ${
                    useful ? "text-[#F91880]" : "text-[#6B7280]"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Nested replies */}
      {hasNested && (
        <div className="ml-[40px]">
          {reply.replies!.map((nested, i) => (
            <ReplyRow
              key={nested.id}
              reply={nested}
              parentAuthor={reply.authorLabel}
              isLast={i === reply.replies!.length - 1}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Inline reply composer (X-style) ───────────────────────────────────────

function ReplyComposer({
  replyingTo,
  onSubmit,
  onCancel,
}: {
  replyingTo?: string
  onSubmit: (content: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState("")

  return (
    <div className="flex gap-2.5 px-4 pb-3 pt-1">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#DFF8EC] text-xs font-bold text-[#07563A]">
        我
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {replyingTo && (
          <p className="text-[13px] leading-5 text-[#536471]">
            回复 @{replyingTo}
          </p>
        )}
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
              setText("")
            }}
            disabled={!text.trim()}
            className="rounded-full bg-[#19C37D] px-4 py-1.5 text-[15px] font-bold text-white transition hover:bg-[#0E8F5F] disabled:opacity-50"
          >
            回复
          </button>
          <button
            onClick={onCancel}
            className="text-[13px] text-[#536471] hover:text-[#0F1419]"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Reply List ─────────────────────────────────────────────────────────────

export function ReviewDiscussionReplyList({
  discussionId,
  replies,
}: {
  discussionId: string
  replies: ReplyItem[]
}) {
  const [showComposer, setShowComposer] = useState(false)
  const [replyItems, setReplyItems] = useState(replies)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyingToName, setReplyingToName] = useState<string | undefined>()

  function handleNewReply(content: string) {
    const newReply: ReplyItem = {
      id: `reply-local-${Date.now()}`,
      discussionId,
      authorLabel: "菠萝探险家",
      authorRole: "anonymous",
      content,
      createdAt: "刚刚",
      usefulCount: 0,
    }

    if (replyingTo) {
      setReplyItems((prev) =>
        prev.map((r) => {
          if (r.id === replyingTo) return { ...r, replies: [...(r.replies ?? []), newReply] }
          if (r.replies) {
            return {
              ...r,
              replies: r.replies.map((n) =>
                n.id === replyingTo
                  ? { ...n, replies: [...(n.replies ?? []), newReply] }
                  : n
              ),
            }
          }
          return r
        })
      )
    } else {
      setReplyItems((prev) => [...prev, newReply])
    }

    setReplyingTo(null)
    setReplyingToName(undefined)
    setShowComposer(false)
  }

  function startReply(id: string, name: string) {
    setReplyingTo(id)
    setReplyingToName(name)
    setShowComposer(true)
  }

  return (
    <div>
      {replyItems.map((reply, i) => (
        <ReplyRow
          key={reply.id}
          reply={reply}
          isLast={i === replyItems.length - 1}
          onReply={(id) => startReply(id, reply.authorLabel)}
        />
      ))}

      {showComposer && (
        <ReplyComposer
          replyingTo={replyingToName}
          onSubmit={handleNewReply}
          onCancel={() => {
            setShowComposer(false)
            setReplyingTo(null)
            setReplyingToName(undefined)
          }}
        />
      )}

      {!showComposer && (
        <button
          onClick={() => {
            setReplyingTo(null)
            setReplyingToName(undefined)
            setShowComposer(true)
          }}
          className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-[#536471] transition hover:bg-[#F7F9F9]/50"
        >
          <MessageCircle className="size-4" />
          写下你的回复...
        </button>
      )}
    </div>
  )
}
