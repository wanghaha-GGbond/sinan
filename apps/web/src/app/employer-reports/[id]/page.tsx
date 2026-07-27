"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

type ReportDetail = {
  id: string
  companyId: string
  reportPeriod: string
  priceCents: number
  status: string
  content: Record<string, unknown>
  createdAt: string
  deliveredAt: string | null
}

export default function EmployerReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<ReportDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/employer/reports/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setReport(d.report ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 text-sm">加载中…</div>
    )
  }
  if (!report) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 text-sm">
        报告不存在
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold">
        {report.reportPeriod} · {report.status}
      </h1>
      <p className="text-muted-foreground mt-2 text-xs">
        companyId:{report.companyId} · 价格:¥
        {(report.priceCents / 100).toFixed(2)} · 创建:
        {new Date(report.createdAt).toLocaleString("zh-CN")}
      </p>

      <section className="bg-card mt-8 rounded-2xl border p-6 shadow-sm">
        <h2 className="text-foreground text-xl font-semibold">聚合洞察</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          全部聚合 — 无任何可定位个人(08 §3 红线)
        </p>
        <pre className="bg-muted mt-4 overflow-x-auto rounded-2xl p-4 text-xs">
          {JSON.stringify(report.content, null, 2)}
        </pre>
      </section>
    </div>
  )
}