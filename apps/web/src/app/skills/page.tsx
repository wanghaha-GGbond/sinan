"use client"

import { useEffect, useState } from "react"

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

export default function SkillsPage() {
  const [items, setItems] = useState<SkillItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.skills ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">一技封神</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          把你的看家本领写下来,3 人背书即可上榜。
        </p>
      </header>

      {loading ? (
        <div className="text-muted-foreground text-sm">加载中…</div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground text-sm">暂无 approved 技能。</div>
      ) : (
        <ul className="space-y-6">
          {items.map((item) => (
            <li
              key={item.id}
              className="bg-card rounded-2xl border p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-foreground text-lg font-semibold">
                    {item.name}
                  </h2>
                  <p className="text-muted-foreground mt-1 text-xs">
                    L{item.trustLevel ?? 0} · {item.jobBand ?? "匿名"}
                  </p>
                </div>
                <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs">
                  👍 {item.endorserCount}
                </span>
              </div>
              <p className="text-foreground mt-3 text-sm leading-relaxed">
                {item.description}
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                证据:{item.evidenceNote}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}