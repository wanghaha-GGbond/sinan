"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const MIN = 10
const MAX = 300

export default function MyHighlightsPage() {
  const router = useRouter()
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    // 确认登录态
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) router.push("/login?next=/me/highlights")
      })
  }, [router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (trimmed.length < MIN || trimmed.length > MAX) {
      setMessage(`内容需 ${MIN}-${MAX} 字`)
      return
    }
    setSubmitting(true)
    setMessage(null)
    const res = await fetch("/api/highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: trimmed }),
    })
    setSubmitting(false)
    if (res.ok) {
      setContent("")
      setMessage("已提交,等待审核")
    } else {
      const data = await res.json().catch(() => ({}))
      setMessage(data.error ?? "提交失败")
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold">提交高光</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        写下一段让你觉得「这就是我」的瞬间。审核通过后展示在 /highlights。
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          maxLength={MAX + 50}
          className="bg-background w-full rounded-2xl border p-4 text-sm"
          placeholder="例:那个周五凌晨,我们把搜索延迟压到 80ms 以下,所有人鼓掌。"
        />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            {content.trim().length} / {MAX}
          </span>
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm disabled:opacity-50"
          >
            {submitting ? "提交中…" : "提交"}
          </button>
        </div>
        {message && (
          <div className="text-muted-foreground text-xs">{message}</div>
        )}
      </form>
    </div>
  )
}