"use client"

import { useEffect, useState } from "react"

const LEGAL_NOTICE =
  "封闭内测 · 不接真钱 · 不构成投资建议 · 仅用站内积分,亏完不充值"

type MarketItem = {
  id: string
  title: string
  description: string
  status: string
  outcomes: string[]
  closesAt: string
}

export default function MarketsPage() {
  const [items, setItems] = useState<MarketItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/markets")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.markets ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="bg-destructive/10 text-destructive mb-6 rounded-2xl border px-4 py-3 text-xs font-medium">
        {LEGAL_NOTICE}
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-semibold">积分竞猜</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          站内积分(每周一发 100,亏完归零) — 本期骨架,法务评审通过才允许公开访问。
        </p>
      </header>

      {loading ? (
        <div className="text-muted-foreground text-sm">加载中…</div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground text-sm">暂无市场。</div>
      ) : (
        <ul className="space-y-4">
          {items.map((m) => (
            <li
              key={m.id}
              className="bg-card rounded-2xl border p-6 shadow-sm"
            >
              <a
                href={`/markets/${m.id}`}
                className="text-foreground text-lg font-semibold underline"
              >
                {m.title}
              </a>
              <p className="text-muted-foreground mt-2 text-xs">
                状态:{m.status} · 截止:
                {new Date(m.closesAt).toLocaleString("zh-CN")}
              </p>
              <p className="text-foreground mt-3 text-sm">{m.description}</p>
              <p className="text-muted-foreground mt-2 text-xs">
                选项:{m.outcomes.join(" / ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}