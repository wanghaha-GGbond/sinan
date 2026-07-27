"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, X } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type QueueReview = {
  id: string
  companyName: string
  title: string
  content: string
  authorRole: string
  directionScore: string
  createdAt: string
}

const reasons = [
  ["sensitive_info", "敏感信息"],
  ["personal_attack", "人身攻击"],
  ["privacy", "泄露隐私"],
  ["spam", "垃圾内容"],
  ["off_topic", "偏离主题"],
  ["duplicate", "重复内容"],
] as const

export function ReviewModerationQueue() {
  const [rows, setRows] = useState<QueueReview[]>([])
  const [reasonsById, setReasonsById] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    fetch("/api/moderation/reviews")
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? "加载失败")
        return result.reviews as QueueReview[]
      })
      .then((reviews) => { if (active) setRows(reviews) })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "加载失败") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function moderate(review: QueueReview, action: "approve" | "reject") {
    const reason = reasonsById[review.id]
    if (action === "reject" && !reason) {
      setError("拒绝前请选择原因")
      return
    }
    setError("")
    const response = await fetch(`/api/moderation/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    })
    const result = await response.json()
    if (!response.ok) {
      setError(result.error ?? "操作失败")
      return
    }
    setRows((current) => current.filter((item) => item.id !== review.id))
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="border-b pb-5"><p className="text-sm font-semibold text-primary">内容先审后发</p><h1 className="mt-2 text-2xl font-semibold">评价审核队列</h1></header>
      {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
      {loading ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="size-5 animate-spin" /></div> : rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">当前队列为空</p>
      ) : (
        <div className="divide-y">
          {rows.map((review) => (
            <article key={review.id} className="grid gap-5 py-6 lg:grid-cols-[1fr_280px]">
              <div><p className="text-xs text-muted-foreground">{review.companyName} · {review.authorRole} · {review.directionScore} 分</p><h2 className="mt-2 font-semibold">{review.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{review.content}</p></div>
              <div className="space-y-3">
                <Select value={reasonsById[review.id]} onValueChange={(value) => value !== null && setReasonsById((current) => ({ ...current, [review.id]: value }))}>
                  <SelectTrigger><SelectValue placeholder="拒绝原因" /></SelectTrigger>
                  <SelectContent>{reasons.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2"><SolidButton variant="secondary" onClick={() => void moderate(review, "reject")}><X className="size-4" />拒绝</SolidButton><SolidButton onClick={() => void moderate(review, "approve")}><Check className="size-4" />通过</SolidButton></div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
