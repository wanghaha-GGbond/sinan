"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { SolidCard } from "@/components/ui/solid-card"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidEmptyState } from "@/components/ui/solid-empty-state"
import { useAuth } from "@/lib/auth-context"

const NAME_MAX = 40
const DESC_MAX = 280
const EVIDENCE_MAX = 280

type MySkill = {
  id: string
  name: string
  endorserCount: number
  status: string
}

const STATUS_LABEL: Record<string, string> = {
  pending: "审核中",
  approved: "已通过",
  rejected: "未通过",
}
const STATUS_COLOR: Record<string, string> = {
  pending: "text-muted-foreground",
  approved: "text-primary",
  rejected: "text-destructive",
}

export default function MySkillsPage() {
  const { user, loading: authLoading } = useAuth()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [evidenceNote, setEvidenceNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [items, setItems] = useState<MySkill[]>([])
  const [listLoading, setListLoading] = useState(true)

  function loadList() {
    fetch("/api/me/skills", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setItems(d.skills ?? []))
      .catch(() => {})
      .finally(() => setListLoading(false))
  }

  useEffect(() => {
    // Defer the unauth branch to a macrotask so the effect body itself
    // stays synchronous — React 19's react-hooks/set-state-in-effect
    // rule treats synchronous setState in an effect as a cascading
    // render signal.
    const handle = window.setTimeout(() => {
      if (!authLoading && user) loadList()
      if (!authLoading && !user) setListLoading(false)
    }, 0)
    return () => window.clearTimeout(handle)
  }, [authLoading, user])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimName = name.trim()
    const trimDesc = description.trim()
    if (!trimName) {
      setMessage({ ok: false, text: "技能名不能为空" })
      return
    }
    if (!trimDesc) {
      setMessage({ ok: false, text: "请添加说明" })
      return
    }
    setSubmitting(true)
    setMessage(null)
    const res = await fetch("/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: trimName, description: trimDesc, evidenceNote: evidenceNote.trim() }),
    })
    setSubmitting(false)
    if (res.ok) {
      setName("")
      setDescription("")
      setEvidenceNote("")
      setMessage({ ok: true, text: "已提交，等待审核 + 背书" })
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">提交一技</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          其他人可背书你的技能，满 3 个背书即上榜公开流。
        </p>
      </header>

      <SolidCard variant="elevated" className="p-6">
        {!user ? (
          <p className="text-sm text-muted-foreground">请先登录后提交技能。</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">技能名（≤{NAME_MAX} 字）</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={NAME_MAX}
                placeholder="例：产品冷启动"
                className="w-full rounded-2xl border border-border/60 bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">说明（≤{DESC_MAX} 字）</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={DESC_MAX}
                placeholder="说明这个技能是干什么的，以及你具体怎么用它"
                className="w-full rounded-2xl border border-border/60 bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">证据 / 案例（选填）</label>
              <textarea
                value={evidenceNote}
                onChange={(e) => setEvidenceNote(e.target.value)}
                rows={2}
                maxLength={EVIDENCE_MAX}
                placeholder="数据、案例、获得的认可"
                className="w-full rounded-2xl border border-border/60 bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {message ? (
              <p className={`text-xs ${message.ok ? "text-primary" : "text-destructive"}`}>{message.text}</p>
            ) : null}
            <SolidButton type="submit" variant="primary" size="sm" disabled={submitting} className="w-full">
              {submitting ? <><Loader2 className="size-4 animate-spin" />提交中…</> : "提交技能"}
            </SolidButton>
          </form>
        )}
      </SolidCard>

      <section className="mt-10">
        <h2 className="mb-4 text-base font-semibold text-foreground">我的技能</h2>
        {listLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />)}
          </div>
        ) : items.length === 0 ? (
          <SolidEmptyState title="还没有提交" description="提交你的看家本领，满 3 人背书即可登上一技封神榜。" />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <SolidCard variant="default" className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs">
                        <span className={STATUS_COLOR[item.status] ?? "text-muted-foreground"}>
                          {STATUS_LABEL[item.status] ?? item.status}
                        </span>
                        <span className="text-muted-foreground">· 背书 {item.endorserCount} / 3</span>
                      </p>
                    </div>
                    {item.endorserCount >= 3 && item.status === "approved" && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        已上榜
                      </span>
                    )}
                  </div>
                </SolidCard>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
