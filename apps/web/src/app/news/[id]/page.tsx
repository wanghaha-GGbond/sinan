"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

type NewsDetail = {
  article: {
    id: string
    sourceUrl: string
    title: string
    summary: string
    publishedAt: string
    sourceKind: string
    companyMentions: string[]
  }
  annotations: Array<{
    id: string
    content: string
    createdAt: string
    annotatorTrustLevel: number
    annotatorJobBand: string | null
  }>
}

const ANNOTATION_MIN = 10
const ANNOTATION_MAX = 500

export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<NewsDetail | null>(null)
  const [content, setContent] = useState("")
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/news/${id}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
  }, [id])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (trimmed.length < ANNOTATION_MIN || trimmed.length > ANNOTATION_MAX) {
      setMessage(`内容需 ${ANNOTATION_MIN}-${ANNOTATION_MAX} 字`)
      return
    }
    const res = await fetch(`/api/news/${id}/annotations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: trimmed }),
    })
    if (res.status === 401) {
      router.push(`/login?next=/news/${id}`)
      return
    }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setMessage(d.error ?? "提交失败")
      return
    }
    setContent("")
    setMessage("已提交批注")
    // 刷新
    fetch(`/api/news/${id}`)
      .then((r) => r.json())
      .then((d) => setData(d))
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      {!data ? (
        <div className="text-muted-foreground text-sm">加载中…</div>
      ) : (
        <>
          <h1 className="text-3xl font-semibold">{data.article.title}</h1>
          <p className="text-muted-foreground mt-2 text-xs">
            {new Date(data.article.publishedAt).toLocaleString("zh-CN")} ·{" "}
            {data.article.sourceKind}
          </p>
          <p className="text-foreground mt-6 text-base leading-relaxed">
            {data.article.summary}
          </p>
          <p className="text-muted-foreground mt-3 text-xs">
            原文链接:{data.article.sourceUrl}
          </p>

          <section className="mt-12">
            <h2 className="text-foreground text-xl font-semibold">批注</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              匿名优先 — 展示时只显示段位 / 职位族,不暴露身份。
            </p>

            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                maxLength={ANNOTATION_MAX + 50}
                placeholder="你的视角 / 内部观察…"
                className="bg-background w-full rounded-2xl border p-3 text-sm"
              />
              <button
                type="submit"
                className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm"
              >
                发布批注
              </button>
              {message && (
                <div className="text-muted-foreground text-xs">{message}</div>
              )}
            </form>

            <ul className="mt-8 space-y-4">
              {data.annotations.map((a) => (
                <li
                  key={a.id}
                  className="bg-card rounded-2xl border p-4 text-sm"
                >
                  <p className="text-foreground">{a.content}</p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    L{a.annotatorTrustLevel} ·{" "}
                    {a.annotatorJobBand ?? "匿名"} ·{" "}
                    {new Date(a.createdAt).toLocaleDateString("zh-CN")}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}