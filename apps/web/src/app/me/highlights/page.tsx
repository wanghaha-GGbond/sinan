"use client"

import { useEffect, useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { SolidCard } from "@/components/ui/solid-card"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidEmptyState } from "@/components/ui/solid-empty-state"
import { useAuth } from "@/lib/auth-context"

const MIN = 10
const MAX = 300

type MyHighlight = {
  id: string
  content: string
  status: string
  createdAt: string
}

const STATUS_LABEL: Record<string, string> = {
  pending: "审核中",
  approved: "已上线",
  rejected: "未通过",
}
const STATUS_COLOR: Record<string, string> = {
  pending: "text-muted-foreground",
  approved: "text-primary",
  rejected: "text-destructive",
}

export default function MyHighlightsPage() {
  const { user, loading: authLoading } = useAuth()
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [items, setItems] = useState<MyHighlight[]>([])
  const [listLoading, setListLoading] = useState(true)

  function loadList() {
    fetch("/api/me/highlights", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setItems(d.highlights ?? []))
      .catch(() => {})
      .finally(() => setListLoading(false))
  }

  useEffect(() => {
    if (!authLoading && user) loadList()
    if (!authLoading && !user) setListLoading(false)
  }, [authLoading, user])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = content.trim()
    if (trimmed.length < MIN || trimmed.length > MAX) {
      setMessage({ ok: false, text: `内容需 ${MIN}–${MAX} 字` })
      return
    }
    setSubmitting(true)
    setMessage(null)
    const res = await fetch("/api/highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content: trimmed }),
    })
    setSubmitting(false)
    if (res.ok) {
      setContent("")
      setMessage({ ok: true, text: "已提交，等待审核" })
      loadList()
    } else {
      const data = await res.json().catch(() => ({}))
      setMessage({ ok: false, text: data.error ?? "提交失败" })
    }
  }

  if (authLoading) {
    return (
      <div className="mx-auto flex max-w-2xl items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Sparkles className="size-5 text-primary" />
          提交高光
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          写下一段让你觉得「这就是我」的瞬间。审核通过后展示在 /highlights。
        </p>
      </header>

      <SolidCard variant="elevated" className="p-6">
        {!user ? (
          <p className="text-sm text-muted-foreground">请先登录后提交高光。</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              maxLength={MAX + 50}
              placeholder="例：那个周五凌晨，我们把搜索延迟压到 80ms 以下，所有人鼓掌。"
              className="w-full rounded-2xl border border-border/60 bg-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex items-center justify-between gap-3">
              <span className={`text-xs ${content.trim().length > MAX ? "text-destructive" : "text-muted-foreground"}`}>
                {content.trim().length} / {MAX}
              </span>
              <SolidButton type="submit" variant="primary" size="sm" disabled={submitting}>
                {submitting ? <><Loader2 className="size-4 animate-spin" />提交中…</> : "提交"}
              </SolidButton>
            </div>
            {message ? (
              <p className={`text-xs ${message.ok ? "text-primary" : "text-destructive"}`}>{message.text}</p>
            ) : null}
          </form>
        )}
      </SolidCard>

      <section className="mt-10">
        <h2 className="mb-4 text-base font-semibold text-foreground">我的提交</h2>
        {listLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}
          </div>
        ) : items.length === 0 ? (
          <SolidEmptyState title="还没有提交" description="写下你的高光瞬间，审核后将展示在公开高光馆。" />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <SolidCard variant="default" className="p-4">
                  <p className="text-sm leading-6 text-foreground line-clamp-3">{item.content}</p>
                  <p className="mt-2 flex items-center gap-2 text-xs">
                    <span className={STATUS_COLOR[item.status] ?? "text-muted-foreground"}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                    <span className="text-muted-foreground">
                      · {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                  </p>
                </SolidCard>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
