"use client"

import { useQuery } from "@tanstack/react-query"
import { CheckCircle2, CircleDashed, XCircle } from "lucide-react"

import type { PublicPromiseRecord } from "@/lib/server/promise-record-view"

const outcomes = {
  kept: { label: "已兑现", icon: CheckCircle2, color: "text-primary" },
  partial: { label: "部分兑现", icon: CircleDashed, color: "text-risk" },
  broken: { label: "未兑现", icon: XCircle, color: "text-destructive" },
}

export function PromiseRecords({ companyId, showEmpty = false }: { companyId: string; showEmpty?: boolean }) {
  const { data: records = [], isPending, error, refetch } = useQuery<PublicPromiseRecord[]>({
    queryKey: ["company-promises", companyId],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/promise-records?companyId=${encodeURIComponent(companyId)}`, { signal })
      if (!response.ok) throw new Error("承诺记录暂时无法加载")
      const result = await response.json()
      if (!Array.isArray(result.records)) throw new Error("承诺记录暂时无法加载")
      return result.records
    },
    retry: false,
    staleTime: 60_000,
  })
  if (isPending) return <p role="status" className="py-5 text-sm text-muted-foreground">正在加载承诺记录…</p>
  if (error) return <div role="alert" className="py-5 text-sm"><p>承诺记录暂时无法加载</p><button type="button" onClick={() => void refetch()} className="mt-2 min-h-11 font-semibold text-primary-deep underline">重试承诺记录</button></div>
  if (records.length === 0) return showEmpty ? <div className="py-6"><h2 className="text-lg font-semibold">暂无公开承诺记录</h2><p className="mt-2 text-sm text-muted-foreground">审核通过的记录会显示在这里。</p></div> : null

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
            <article key={record.id} className="grid gap-3 py-4 sm:grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <span className="border border-border px-2 py-1 text-xs">
                  {record.promiseCategory}
                </span>
                <p className="mt-2 text-xs text-muted-foreground">{record.promiseDate}</p>
              </div>
              <div className="min-w-0 break-words">
                <p className="text-xs text-muted-foreground">当时承诺</p>
                <p className="mt-1 text-sm leading-6 text-foreground">{record.promiseText}</p>
              </div>
              <div className="min-w-0 break-words">
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
