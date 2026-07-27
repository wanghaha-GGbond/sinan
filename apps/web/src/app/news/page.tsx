"use client"

import { useEffect, useState } from "react"

type NewsItem = {
  id: string
  sourceUrl: string
  title: string
  summary: string
  publishedAt: string
  sourceKind: string
  companyMentions: string[]
}

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.articles ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">新闻</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          公开招聘 / 公司新闻源(本期 mock,真 cron M3.1+ 接)。读者可匿名批注。
        </p>
      </header>

      {loading ? (
        <div className="text-muted-foreground text-sm">加载中…</div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground text-sm">暂无文章。</div>
      ) : (
        <ul className="space-y-6">
          {items.map((item) => (
            <li
              key={item.id}
              className="bg-card rounded-2xl border p-6 shadow-sm"
            >
              <a
                href={`/news/${item.id}`}
                className="text-foreground text-lg font-semibold underline"
              >
                {item.title}
              </a>
              <p className="text-muted-foreground mt-2 text-xs">
                {new Date(item.publishedAt).toLocaleDateString("zh-CN")} ·{" "}
                {item.sourceKind}
              </p>
              <p className="text-foreground mt-3 text-sm leading-relaxed">
                {item.summary}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}