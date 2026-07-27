"use client"

import { useEffect, useState } from "react"

type ReportRow = {
  id: string
  companyId: string
  reportPeriod: string
  priceCents: number
  status: string
  createdAt: string
  paidAt: string | null
  deliveredAt: string | null
}

export default function EmployerReportsPage() {
  const [companyId, setCompanyId] = useState("")
  const [period, setPeriod] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  )
  const [priceCents, setPriceCents] = useState<number>(9900)
  const [items, setItems] = useState<ReportRow[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = () => {
    if (!companyId) return
    fetch(`/api/employer/reports/${companyId}`)
      .then((r) => r.json())
      .then((d) => setItems(d.reports ?? []))
  }

  useEffect(() => {
    refresh()
  }, [companyId])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const res = await fetch(`/api/employer/reports/${companyId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportPeriod: period,
        priceCents,
        simulatePay: true,
      }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setMessage(d.error ?? "创建失败")
      return
    }
    const d = await res.json()
    setMessage(d.created ? "已生成报告(draft → paid → delivered)" : "已存在该周期报告")
    refresh()
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">雇主品牌体检报告</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          M4 探索期骨架 — 只展示聚合洞察(08 §3 红线),
          严禁任何 reviewer 引用 / 单条 review 内容。
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="bg-card space-y-3 rounded-2xl border p-6"
      >
        <div>
          <label className="text-muted-foreground text-xs">companyId</label>
          <input
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            placeholder="UUID"
            className="bg-background mt-1 w-full rounded-2xl border p-2 text-sm"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-muted-foreground text-xs">
              reportPeriod
            </label>
            <input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="YYYY-MM"
              className="bg-background mt-1 w-full rounded-2xl border p-2 text-sm"
            />
          </div>
          <div className="w-32">
            <label className="text-muted-foreground text-xs">priceCents</label>
            <input
              type="number"
              min={1}
              value={priceCents}
              onChange={(e) => setPriceCents(Number(e.target.value))}
              className="bg-background mt-1 w-full rounded-2xl border p-2 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !companyId}
          className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm disabled:opacity-50"
        >
          {loading ? "处理中…" : "创建 + 模拟支付"}
        </button>
        {message && (
          <div className="text-muted-foreground text-xs">{message}</div>
        )}
      </form>

      <section className="mt-8">
        <h2 className="text-foreground text-xl font-semibold">该公司的报告</h2>
        <ul className="mt-4 space-y-3">
          {items.map((r) => (
            <li
              key={r.id}
              className="bg-card rounded-2xl border p-4 text-sm"
            >
              <a
                href={`/employer-reports/${r.id}`}
                className="text-foreground font-medium underline"
              >
                {r.reportPeriod} · {r.status}
              </a>
              <p className="text-muted-foreground mt-1 text-xs">
                价格:¥{(r.priceCents / 100).toFixed(2)} · 创建:
                {new Date(r.createdAt).toLocaleString("zh-CN")}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}