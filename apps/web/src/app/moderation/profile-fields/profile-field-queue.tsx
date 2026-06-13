"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, X } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"

type Submission = {
  userId: string
  displayName: string | null
  field: "highlightMoment" | "declinedOffer"
  value: string
  updatedAt: string
}

export function ProfileFieldQueue() {
  const [rows, setRows] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actingKey, setActingKey] = useState("")

  useEffect(() => {
    let active = true
    fetch("/api/moderation/profile-fields", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? "加载失败")
        return result.submissions as Submission[]
      })
      .then((submissions) => {
        if (active) setRows(submissions)
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "加载失败")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function act(row: Submission, action: "approve" | "reject") {
    const key = `${row.userId}:${row.field}`
    setActingKey(key)
    setError("")
    try {
      const response = await fetch(`/api/moderation/profile-fields/${row.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: row.field, action }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? "操作失败")
      setRows((current) =>
        current.filter(
          (item) => item.userId !== row.userId || item.field !== row.field
        )
      )
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "操作失败")
    } finally {
      setActingKey("")
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="border-b border-border pb-5">
        <p className="text-sm font-semibold text-primary">身份审核</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">公开字段队列</h1>
      </header>
      {error ? <p role="alert" className="mt-5 text-sm text-destructive">{error}</p> : null}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">当前队列为空</p>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((row) => {
            const key = `${row.userId}:${row.field}`
            return (
              <article key={key} className="grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {row.displayName ?? "匿名用户"} · {row.field === "highlightMoment" ? "高光时刻" : "拒绝陈列"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{row.value}</p>
                </div>
                <div className="flex gap-2">
                  <SolidButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={actingKey === key}
                    onClick={() => void act(row, "reject")}
                  >
                    <X className="size-4" />
                    拒绝
                  </SolidButton>
                  <SolidButton
                    type="button"
                    size="sm"
                    disabled={actingKey === key}
                    onClick={() => void act(row, "approve")}
                  >
                    <Check className="size-4" />
                    通过
                  </SolidButton>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
