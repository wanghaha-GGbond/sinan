"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, X } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { Textarea } from "@/components/ui/textarea"

type RecordItem = {
  id: string
  promiseCategory: string
  promiseText: string
  promiseDate: string
  outcomeText: string
  outcomeStatus: string
  evidenceType: string
}

export function PromiseRecordQueue() {
  const [rows, setRows] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [reasonById, setReasonById] = useState<Record<string, string>>({})
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    fetch("/api/moderation/promise-records")
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? "加载失败")
        return result.records as RecordItem[]
      })
      .then((records) => {
        if (active) setRows(records)
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

  async function act(record: RecordItem, action: "approve" | "reject") {
    const reason = reasonById[record.id]?.trim()
    if (action === "reject" && !reason) {
      setError("拒绝前请填写原因")
      return
    }
    const response = await fetch(`/api/moderation/promise-records/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    })
    const result = await response.json()
    if (!response.ok) {
      setError(result.error ?? "操作失败")
      return
    }
    setRows((current) => current.filter((item) => item.id !== record.id))
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="border-b border-border pb-5">
        <p className="text-sm font-semibold text-primary">高风险内容审核</p>
        <h1 className="mt-2 text-2xl font-semibold">承诺记录队列</h1>
      </header>
      {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">当前队列为空</p>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((record) => (
            <article key={record.id} className="grid gap-5 py-6 lg:grid-cols-[1fr_320px]">
              <div>
                <p className="text-xs text-muted-foreground">
                  {record.promiseCategory} · {record.promiseDate} · {record.evidenceType}
                </p>
                <p className="mt-3 text-sm"><strong>承诺：</strong>{record.promiseText}</p>
                <p className="mt-2 text-sm"><strong>结果：</strong>{record.outcomeText}</p>
              </div>
              <div className="space-y-3">
                <Textarea
                  value={reasonById[record.id] ?? ""}
                  onChange={(event) => setReasonById((current) => ({ ...current, [record.id]: event.target.value }))}
                  placeholder="拒绝原因"
                  className="min-h-20"
                />
                <div className="grid grid-cols-2 gap-2">
                  <SolidButton type="button" variant="secondary" onClick={() => void act(record, "reject")}>
                    <X className="size-4" />拒绝
                  </SolidButton>
                  <SolidButton type="button" onClick={() => void act(record, "approve")}>
                    <Check className="size-4" />通过
                  </SolidButton>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
