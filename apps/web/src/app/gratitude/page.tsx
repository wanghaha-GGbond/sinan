"use client"

import { useEffect, useState } from "react"

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

export default function GratitudePage() {
  const [items, setItems] = useState<GratitudeItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/gratitude")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">感谢信漂流</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          公开的感谢信流 — 匿名模式下只显示段位,不暴露身份。
        </p>
      </header>

      {loading ? (
        <div className="text-muted-foreground text-sm">加载中…</div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground text-sm">还没有感谢信。</div>
      ) : (
        <ul className="space-y-6">
          {items.map((item) => {
            const isAnon = item.isAnonymous === "true"
            return (
              <li
                key={item.id}
                className="bg-card rounded-2xl border p-6 shadow-sm"
              >
                <p className="text-foreground text-base leading-relaxed">
                  {item.content}
                </p>
                <div className="text-muted-foreground mt-3 text-xs">
                  {isAnon ? (
                    <>匿名 · L{item.fromTrustLevel ?? 0} 段位</>
                  ) : (
                    <>
                      来自 {item.fromDisplayName ?? "匿名用户"} · L
                      {item.fromTrustLevel ?? 0} ·{" "}
                      {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}