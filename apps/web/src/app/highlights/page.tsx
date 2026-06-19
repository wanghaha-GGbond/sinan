"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { SolidCard } from "@/components/ui/solid-card"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidEmptyState } from "@/components/ui/solid-empty-state"

type HighlightItem = {
  id: string
  content: string
  createdAt: string
  userId: string
  displayName: string | null
  jobBand: string | null
  trustLevel: number
}

export default function HighlightsPage() {
  const [items, setItems] = useState<HighlightItem[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/highlights")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.highlights ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <Sparkles className="size-5 text-primary" />
            高光馆
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            那些我们见证过的职场 moment — 审核通过后展示，匿名优先。
          </p>
        </div>
        <SolidButton asChild variant="secondary" size="sm">
          <Link href="/me/highlights">写我的高光</Link>
        </SolidButton>
      </header>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : items?.length === 0 ? (
        <SolidEmptyState
          title="高光馆尚无收录"
          description="成为第一批分享真实职场时刻的人。审核通过后将在这里展示。"
          action={
            <SolidButton asChild variant="primary" size="sm">
              <Link href="/me/highlights">提交高光</Link>
            </SolidButton>
          }
        />
      ) : (
        <ul className="space-y-4">
          {items?.map((item) => (
            <li key={item.id}>
              <SolidCard variant="elevated" className="p-6">
                <p className="text-base leading-7 text-foreground">{item.content}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  L{item.trustLevel ?? 0}
                  {item.jobBand ? ` · ${item.jobBand}` : " · 匿名"}
                  {" · "}
                  {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                </p>
              </SolidCard>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
