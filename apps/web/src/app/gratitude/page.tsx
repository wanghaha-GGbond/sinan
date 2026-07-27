"use client"

import { useEffect, useState } from "react"
import { Heart, Loader2, Send } from "lucide-react"
import { SolidCard } from "@/components/ui/solid-card"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidEmptyState } from "@/components/ui/solid-empty-state"
import { useAuth } from "@/lib/auth-context"

type GratitudeItem = {
  id: string
  fromUserId: string
  toUserId: string | null
  content: string
  isAnonymous: string
  createdAt: string
  fromDisplayName: string | null
  fromJobBand: string | null
  fromTrustLevel: number
}

function SendGratitudeForm({ onSent, onClose }: { onSent: () => void; onClose: () => void }) {
  const { user } = useAuth()
  const [toUserId, setToUserId] = useState("")
  const [content, setContent] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  if (!user) return null

  async function handle(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = content.trim()
    if (trimmed.length < 10) {
      setMessage({ ok: false, text: "内容至少 10 字" })
      return
    }
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch("/api/gratitude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ toUserId: toUserId.trim() || undefined, content: trimmed, isAnonymous }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "提交失败" })
        return
      }
      setMessage({ ok: true, text: "感谢信已发送！" })
      setContent("")
      setToUserId("")
      onSent()
      setTimeout(onClose, 1200)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SolidCard variant="elevated" className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">写一封感谢信</h2>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">取消</button>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">同一人 12 小时内最多发 1 封。</p>
      <form onSubmit={handle} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground">
            收件人 ID（选填，不填为漂流信）
          </label>
          <input
            type="text"
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            placeholder="用户 ID（留空则为公开漂流）"
            className="w-full rounded-2xl border border-border/60 bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground">内容（10–500 字）</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={510}
            placeholder="谢谢你在那个时刻…"
            className="w-full rounded-2xl border border-border/60 bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-0.5 text-right text-[10px] text-muted-foreground">{content.length} / 500</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="anon-toggle"
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="anon-toggle" className="text-sm text-foreground">匿名发送</label>
        </div>
        {message ? (
          <p className={`text-xs ${message.ok ? "text-primary" : "text-destructive"}`}>{message.text}</p>
        ) : null}
        <SolidButton type="submit" variant="primary" disabled={submitting} className="w-full">
          {submitting ? <><Loader2 className="size-4 animate-spin" />发送中…</> : <><Send className="size-4" />发送感谢信</>}
        </SolidButton>
      </form>
    </SolidCard>
  )
}

export default function GratitudePage() {
  const { user } = useAuth()
  const [items, setItems] = useState<GratitudeItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  function load() {
    fetch("/api/gratitude")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">感谢信</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">匿名模式下只显示段位，不暴露身份。</p>
        </div>
        {user && (
          <SolidButton size="sm" variant="primary" onClick={() => setShowForm(true)}>
            写信
          </SolidButton>
        )}
      </div>

      {/* Write form (shown inline on click) */}
      {showForm && (
        <SendGratitudeForm onSent={load} onClose={() => setShowForm(false)} />
      )}

      {/* Letter feed */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-[28px] bg-muted" />)}
        </div>
      ) : items?.length === 0 ? (
        <SolidEmptyState
          title="还没有感谢信"
          description="成为第一个写感谢信的人。"
        />
      ) : (
        <div className="space-y-3">
          {items?.map((item) => {
            const isAnon = item.isAnonymous === "true"
            const fromLabel = isAnon
              ? `匿名 · L${item.fromTrustLevel ?? 0}`
              : `${item.fromDisplayName ?? "匿名"} · L${item.fromTrustLevel ?? 0}`
            const timeLabel = new Date(item.createdAt).toLocaleDateString("zh-CN")

            return (
              <SolidCard key={item.id} variant="default" className="p-5">
                {/* From + time */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{fromLabel}</span>
                  <span className="text-[11px] text-muted-foreground">{timeLabel}</span>
                </div>

                {/* Content */}
                <p className="mb-4 text-sm leading-7 text-foreground">{item.content}</p>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border/60 pt-3">
                  <span className="text-[11px] text-muted-foreground">
                    {item.toUserId ? "定向感谢" : "漂流信"}
                  </span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Heart className="size-3" />
                    <span className="text-xs">—</span>
                  </div>
                </div>
              </SolidCard>
            )
          })}
        </div>
      )}
    </section>
  )
}
