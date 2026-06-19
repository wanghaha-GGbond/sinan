"use client"

import { useEffect, useState } from "react"
import { Loader2, Send } from "lucide-react"
import { SolidCard } from "@/components/ui/solid-card"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidEmptyState } from "@/components/ui/solid-empty-state"
import { useAuth } from "@/lib/auth-context"

type GratitudeItem = {
  id: string
  fromUserId: string
  toUserId: string
  content: string
  isAnonymous: string
  createdAt: string
  fromDisplayName: string | null
  fromJobBand: string | null
  fromTrustLevel: number
}

function SendGratitudeForm({ onSent }: { onSent: () => void }) {
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
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SolidCard variant="elevated" className="p-6">
      <h2 className="text-base font-semibold text-foreground">写一封感谢信</h2>
      <p className="mt-1 text-xs text-muted-foreground">同一人 12 小时内最多发 1 封。</p>
      <form onSubmit={handle} className="mt-4 space-y-4">
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
        <SolidButton type="submit" variant="primary" size="sm" disabled={submitting} className="w-full">
          {submitting ? <><Loader2 className="size-4 animate-spin" />发送中…</> : <><Send className="size-4" />发送感谢信</>}
        </SolidButton>
      </form>
    </SolidCard>
  )
}

export default function GratitudePage() {
  const [items, setItems] = useState<GratitudeItem[] | null>(null)
  const [loading, setLoading] = useState(true)

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
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">感谢信漂流</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          公开的感谢信流 — 匿名模式下只显示段位，不暴露身份。
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">公开信流</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
            </div>
          ) : items?.length === 0 ? (
            <SolidEmptyState
              title="还没有感谢信"
              description="成为第一个写感谢信的人。"
            />
          ) : (
            <ul className="space-y-3">
              {items?.map((item) => {
                const isAnon = item.isAnonymous === "true"
                return (
                  <li key={item.id}>
                    <SolidCard variant="default" className="p-4">
                      <p className="text-sm leading-6 text-foreground">{item.content}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {isAnon
                          ? `匿名 · L${item.fromTrustLevel ?? 0}`
                          : `来自 ${item.fromDisplayName ?? "匿名"} · L${item.fromTrustLevel ?? 0}`}
                        {" · "}
                        {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                      </p>
                    </SolidCard>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <SendGratitudeForm onSent={load} />
        </div>
      </div>
    </section>
  )
}
