"use client"

import Link from "next/link"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useCompanySearch } from "@/lib/queries/company-search"
import { type PublicPulsePoint, shiftPulseDay } from "@/lib/pulse"
import { SolidCard } from "@/components/ui/solid-card"

type CompanyReport = { company: { id: string; name: string }; from: string; through: string; minimumParticipants: number; points: PublicPulsePoint[] }

export function CompanyPulseDashboard() {
  const catalog = useCompanySearch()
  const [chosen, setChosen] = useState("")
  const companyId = chosen || catalog.data?.[0]?.id || ""
  const report = useQuery<CompanyReport>({
    queryKey: ["company-pulse", companyId], enabled: !!companyId, staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/companies/" + encodeURIComponent(companyId) + "/pulse", { signal, cache: "no-store" })
      if (!response.ok) throw new Error("公司趋势暂时无法加载")
      return response.json()
    },
  })
  const points = report.data?.points ?? []
  const last = points.at(-1)
  // Suppressed days stay missing. Never interpolate across a privacy gap.
  const from = report.data?.from
  const days = from ? Array.from({ length: 14 }, (_, index) => shiftPulseDay(from, index)) : []
  let connected = false
  const path = days.map((day, index) => {
    const point = points.find(point => point.day === day)
    if (!point) { connected = false; return "" }
    const command = connected ? "L" : "M"; connected = true
    return command + (20 + index * 34) + "," + (170 - point.score * 1.5)
  }).join(" ")

  return <SolidCard className="min-w-0 p-5 sm:p-7" data-testid="company-pulse-panel">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-semibold text-primary-deep">COMPANY PULSE</p><h2 className="mt-1 text-xl font-semibold">公司匿名趋势</h2></div>
      <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-deep underline" href="/companies">公司广场</Link>
    </div>
    {catalog.isPending ? <p role="status" className="mt-5">正在加载公司…</p> : catalog.error && !catalog.data ? <p role="alert">公司加载失败 <button className="min-h-11 underline" onClick={() => void catalog.refetch()}>重试</button></p> : !catalog.data?.length ? <p className="mt-5">暂无已收录公司</p> : <>
      <label className="mt-5 block space-y-2"><span className="text-sm">查看公司</span><select className="min-h-11 w-full rounded-lg border border-input bg-card px-3 text-foreground" value={companyId} onChange={event => setChosen(event.target.value)}>{catalog.data.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
      {report.isPending ? <p role="status" className="py-8">正在加载趋势…</p> : report.isError ? <p role="alert" className="py-8">公司趋势暂时无法加载 <button className="min-h-11 underline" onClick={() => void report.refetch()}>重试</button></p> : <>
        <div className="my-5 flex items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{report.data.from} — {report.data.through}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{last?.score ?? "—"}<span className="ml-1 text-sm text-muted-foreground">/ 100</span></p></div>{last && <p className="text-xs text-muted-foreground">最近有效日 {last.day}<br />{last.participants} 人参与</p>}</div>
        {!points.length ? <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-10 text-center"><p className="font-medium">样本积累中</p><p className="mt-2 text-sm text-muted-foreground">每天至少 30 位有效参与者才展示当天结果。</p></div> : <>
          <svg role="img" aria-label="近十四天公司 Pulse 趋势，缺失日期不连线" viewBox="0 0 482 200" className="mt-4 w-full text-primary-deep">
            {[0, 50, 100].map(value => <g key={value}><line x1="20" x2="462" y1={170-value*1.5} y2={170-value*1.5} stroke="var(--border)" strokeDasharray="4 4" /><text x="0" y={174-value*1.5} fontSize="10" fill="var(--muted-foreground)">{value}</text></g>)}
            <path d={path} fill="none" stroke="currentColor" strokeWidth="3" />
            {days.map((day,index) => { const point = points.find(point => point.day === day); return point ? <circle key={day} cx={20+index*34} cy={170-point.score*1.5} r="4" fill="currentColor"><title>{day}: {point.score}/100，{point.participants} 人</title></circle> : null })}
            <text x="20" y="195" fontSize="11" fill="var(--muted-foreground)">{days[0]?.slice(5)}</text><text x="425" y="195" fontSize="11" fill="var(--muted-foreground)">{days.at(-1)?.slice(5)}</text>
          </svg>
          <details className="mt-3"><summary className="min-h-11 cursor-pointer text-sm">查看每日数据</summary><ul className="divide-y divide-border text-sm">{points.map(point => <li key={point.day} className="flex justify-between gap-2 py-3"><span>{point.day}</span><span>{point.score} / 100 · {point.participants} 人</span></li>)}</ul></details>
        </>}
      </>}
    </>}
    <p className="mt-5 text-xs leading-6 text-muted-foreground">只统计已结束日期、已认证且主动参与的账号，每人每天一次。低于 30 人不展示；人数以区间、分数以 5 分刻度显示，不提供部门筛选或个人明细。</p>
  </SolidCard>
}
