"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, ThumbsUp } from "lucide-react"
import { SolidCard } from "@/components/ui/solid-card"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidEmptyState } from "@/components/ui/solid-empty-state"
import { useAuth } from "@/lib/auth-context"

type SkillItem = {
  id: string
  userId: string
  name: string
  description: string
  evidenceNote: string
  endorserCount: number
  createdAt: string
  displayName: string | null
  jobBand: string | null
  trustLevel: number
}

function EndorseButton({ skillId, onDone }: { skillId: string; onDone: () => void }) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) {
    return (
      <Link href="/login" className="text-xs text-primary hover:underline">
        登录后背书
      </Link>
    )
  }

  async function handle() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/skills/${skillId}/endorse`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "操作失败")
        return
      }
      setDone(true)
      onDone()
    } catch {
      setError("网络异常")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <SolidButton
        type="button"
        variant="secondary"
        size="sm"
        onClick={handle}
        disabled={busy || done}
      >
        {done ? (
          "已背书 ✓"
        ) : busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <ThumbsUp className="size-3.5" />
            背书
          </>
        )}
      </SolidButton>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

export default function SkillsPage() {
  const [items, setItems] = useState<SkillItem[] | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.skills ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">一技封神</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            把你的看家本领写下来，3 人背书即可上榜。L1+ 认证用户可背书。
          </p>
        </div>
        <SolidButton asChild variant="secondary" size="sm">
          <Link href="/me/skills">提交我的技能</Link>
        </SolidButton>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : items?.length === 0 ? (
        <SolidEmptyState
          title="暂无已审核技能"
          description="成为第一批提交技能的人，通过审核 + 3 人背书即可上榜。"
          action={
            <SolidButton asChild variant="primary" size="sm">
              <Link href="/me/skills">提交技能</Link>
            </SolidButton>
          }
        />
      ) : (
        <ul className="space-y-4">
          {items?.map((item) => (
            <li key={item.id}>
              <SolidCard variant="elevated" className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-foreground">{item.name}</h2>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {item.endorserCount} 背书
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      L{item.trustLevel ?? 0}
                      {item.jobBand ? ` · ${item.jobBand}` : ""}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground">{item.description}</p>
                    {item.evidenceNote && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        证据：{item.evidenceNote}
                      </p>
                    )}
                  </div>
                  <EndorseButton skillId={item.id} onDone={load} />
                </div>
              </SolidCard>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
