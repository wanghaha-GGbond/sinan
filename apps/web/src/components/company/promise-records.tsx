"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, CircleDashed, XCircle } from "lucide-react"

import type { PublicPromiseRecord } from "@/lib/server/promise-record-view"

const outcomes = {
  kept: { label: "已兑现", icon: CheckCircle2, color: "text-primary" },
  partial: { label: "部分兑现", icon: CircleDashed, color: "text-risk" },
  broken: { label: "未兑现", icon: XCircle, color: "text-destructive" },
}

export function PromiseRecords({ companyId }: { companyId: string }) {
  const [records, setRecords] = useState<PublicPromiseRecord[]>([])

  useEffect(() => {
    let active = true
    fetch(`/api/promise-records?companyId=${companyId}`)
      .then((response) => response.json())
      .then((result: { records?: PublicPromiseRecord[] }) => {
        if (active) setRecords(result.records ?? [])
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [companyId])

  if (records.length === 0) return null

  return (
    <section className="my-5 border-y border-border py-5">
      <h2 className="text-base font-semibold text-foreground">承诺 vs 兑现</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        结构化记录均经过人工审核，不展示证据原件
      </p>
      <div className="mt-4 divide-y divide-border">
        {records.map((record) => {
          const outcome = outcomes[record.outcomeStatus]
          const Icon = outcome.icon
          return (
            <article key={record.id} className="grid gap-3 py-4 sm:grid-cols-[120px_1fr_1fr]">
              <div>
                <span className="border border-border px-2 py-1 text-xs">
                  {record.promiseCategory}
                </span>
                <p className="mt-2 text-xs text-muted-foreground">{record.promiseDate}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">当时承诺</p>
                <p className="mt-1 text-sm leading-6 text-foreground">{record.promiseText}</p>
              </div>
              <div>
                <p className={`flex items-center gap-1.5 text-xs font-semibold ${outcome.color}`}>
                  <Icon className="size-4" />
                  {outcome.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-foreground">{record.outcomeText}</p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
