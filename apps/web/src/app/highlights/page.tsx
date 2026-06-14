"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

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
  const [items, setItems] = useState<HighlightItem[]>([])
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
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">高光馆</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          那些我们见证过的 moment — 审核通过后展示,匿名优先。
        </p>
        <div className="mt-3 text-xs">
          <Link href="/me/highlights" className="text-primary underline">
            提交我的高光 →
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="text-muted-foreground text-sm">加载中…</div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground text-sm">
          暂无已审核通过的高光,先来{" "}
          <Link href="/me/highlights" className="underline">
            写一条
          </Link>
          。
        </div>
      ) : (
        <ul className="space-y-6">
          {items.map((item) => (
            <li
              key={item.id}
              className="bg-card rounded-2xl border p-6 shadow-sm"
            >
              <p className="text-foreground text-base leading-relaxed">
                {item.content}
              </p>
              <div className="text-muted-foreground mt-3 text-xs">
                L{item.trustLevel ?? 0} ·{" "}
                {item.jobBand ?? "匿名"} ·{" "}
                {new Date(item.createdAt).toLocaleDateString("zh-CN")}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}