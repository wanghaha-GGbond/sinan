"use client"

import Link from "next/link"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Activity, CalendarDays, Clock3, Share2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { formatPulseTime, pulseScore, type PulseRecord, type summarizePulse } from "@/lib/pulse"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { CompanyPulseDashboard } from "./company-pulse-dashboard"

type Summary = ReturnType<typeof summarizePulse>
type Report = { today: string; records: PulseRecord[]; summary: Summary; week: Summary; month: Summary; eligibleCompanies: { id: string; name: string }[] }
const fieldClass = "block min-h-11 w-full rounded-lg border border-input bg-card px-3 text-foreground focus-visible:outline-2 focus-visible:outline-ring"
const hoursText = (minutes: number | null | undefined) => minutes == null ? "—" : (minutes / 60).toFixed(1) + "h"

function PulseRing({ value, label, color }: { value: number | null | undefined; label: string; color: string }) {
  return <div className="flex min-w-0 flex-col items-center text-center"><div className="grid size-20 place-items-center rounded-full sm:size-28" style={{ background: "conic-gradient(" + color + " " + ((value ?? 0) * 3.6) + "deg, var(--muted) 0deg)" }}><div className="grid size-14 place-items-center rounded-full bg-card sm:size-20"><p className="text-2xl font-semibold tabular-nums">{value ?? "—"}<span className="block text-[11px] font-normal text-muted-foreground">/ 100</span></p></div></div><p className="mt-3 text-sm font-medium">{label}</p></div>
}

function CheckInForm({ data, refresh }: { data: Report; refresh: () => Promise<unknown> }) {
  const today = data.records.find(record => record.day === data.today)
  const [energy, setEnergy] = useState(today ? String(today.energy) : "")
  const [pressure, setPressure] = useState(today ? String(today.pressure) : "")
  const [hours, setHours] = useState(today?.workMinutes == null ? "" : String(today.workMinutes / 60))
  const [endTime, setEndTime] = useState(today?.endMinute == null ? "" : formatPulseTime(today.endMinute))
  const [companyId, setCompanyId] = useState(today?.companyId ?? "")
  const [shareWithCompany, setShare] = useState(!!today?.companyId)
  const [saving, setSaving] = useState(false), [message, setMessage] = useState("")
  async function save() {
    if (!energy || !pressure || saving) return
    setSaving(true); setMessage("")
    try {
      const [h, m] = endTime.split(":").map(Number)
      const response = await fetch("/api/me/pulse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ energy: Number(energy), pressure: Number(pressure), workMinutes: hours === "" ? null : Math.round(Number(hours) * 60), endMinute: endTime ? h * 60 + m : null, companyId: shareWithCompany ? companyId || null : null, shareWithCompany }) })
      if (!response.ok) throw new Error((await response.json()).error ?? "保存失败，请重试")
      setMessage("今天的记录已保存"); await refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存失败，请重试") } finally { setSaving(false) }
  }
  return <SolidCard className="min-w-0 p-5 sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{data.today} · 北京时间</p><h2 className="mt-1 text-xl font-semibold">今天工作得怎么样？</h2></div><Activity className="size-5 shrink-0 text-primary-deep" /></div>
    <form className="mt-6 space-y-5" onSubmit={event => { event.preventDefault(); void save() }}>
      {([["下班时还有多少精力？", energy, setEnergy], ["今天的工作压力？", pressure, setPressure]] as const).map(([label, value, setter]) => <label key={label} className="block space-y-2"><span className="text-sm">{label}</span><select required className={fieldClass} value={value} onChange={event => setter(event.target.value)}><option value="">请选择</option>{Array.from({ length: 10 }, (_, i) => <option key={i} value={i + 1}>{i + 1} / 10{ i === 0 ? " · 最低" : i === 9 ? " · 最高" : ""}</option>)}</select></label>)}
      <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-2"><span className="text-sm">工作时长（小时，选填）</span><input className={fieldClass} type="number" min="0" max="24" step="any" value={hours} onChange={e => setHours(e.target.value)} /></label><label className="block space-y-2"><span className="text-sm">下班时间（选填）</span><input className={fieldClass} type="time" value={endTime} onChange={event => setEndTime(event.target.value)} /></label></div>
      <fieldset className="space-y-3 border-t border-border pt-4"><legend className="text-sm font-medium">公司匿名统计（自愿）</legend>{data.eligibleCompanies?.length ? <><label className="block space-y-2"><span className="text-sm">已认证公司</span><select className={fieldClass} value={companyId} onChange={event => { setCompanyId(event.target.value); setShare(false) }}><option value="">仅记录给自己</option>{data.eligibleCompanies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label><label className="flex min-h-11 items-start gap-3 text-sm"><input className="mt-1 size-4 accent-primary" type="checkbox" checked={shareWithCompany} disabled={!companyId} onChange={event => setShare(event.target.checked)} /><span>同意将今天的精力和压力用于这家公司的匿名统计</span></label></> : <p className="text-sm text-muted-foreground">个人记录仅自己可见。<Link className="ml-1 text-primary-deep underline" href="/company-verification">完成公司认证</Link>后可自愿参与统计。</p>}</fieldset>
      <SolidButton type="submit" className="w-full" disabled={saving || !energy || !pressure || (shareWithCompany && !companyId)}>{saving ? "正在保存…" : "保存今天"}</SolidButton>
    </form><p role="status" className="mt-3 text-sm">{message}</p><p className="mt-2 text-xs text-muted-foreground">每天可更新；不默认选分，不公开个人工时和下班时间。</p>
  </SolidCard>
}

function PersonalReport({ userId }: { userId: string }) {
  const [message, setMessage] = useState(""), [confirmClear, setConfirmClear] = useState(false), [clearing, setClearing] = useState(false), [revision, setRevision] = useState(0)
  const report = useQuery<Report>({ queryKey: ["personal-pulse", userId], staleTime: 0,
    queryFn: async ({ signal }) => { const response = await fetch("/api/me/pulse", { signal, cache: "no-store" }); if (!response.ok) throw new Error("记录加载失败"); return response.json() },
  })
  async function share() {
    const summary = report.data?.summary
    if (!summary || summary.score === null) return
    const text = "我的在场 Pulse：近 7 天记录 " + summary.days + " 天，平均 " + summary.score + "/100。"
    try { if (navigator.share) await navigator.share({ title: "我的 Pulse", text }); else { await navigator.clipboard.writeText(text); setMessage("周报摘要已复制") } }
    catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setMessage("分享失败，请重试") }
  }
  async function clear() {
    if (clearing) return
    setClearing(true); setMessage("")
    try {
      const response = await fetch("/api/me/pulse", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation: "DELETE_MY_PULSE" }) })
      if (!response.ok) throw new Error("清除失败，请重试")
      await report.refetch(); setRevision(value => value + 1); setConfirmClear(false); setMessage("个人记录已清除，不再参与公司统计")
    } catch (error) { setMessage(error instanceof Error ? error.message : "清除失败") } finally { setClearing(false) }
  }
  if (report.isPending) return <p role="status" className="py-8">正在加载个人周报…</p>
  if (report.isError) return <div role="alert" className="rounded-lg border border-border p-5">记录加载失败 <button className="min-h-11 underline" onClick={() => void report.refetch()}>重试</button></div>
  const data = report.data
  return <>
    <SolidCard className="overflow-hidden p-0" data-testid="pulse-share-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary/10 px-5 py-4"><div><p className="text-xs font-semibold text-primary-deep">MY PULSE</p><h2 className="mt-1 text-xl font-semibold">我的工作周报</h2></div><SolidButton type="button" variant="secondary" disabled={!data.records.length} onClick={() => void share()}><Share2 className="size-4" />分享我的周报</SolidButton></div>
      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_320px]"><div><div className="grid grid-cols-3 gap-2"><PulseRing value={data.summary.score} label="近 7 天 Pulse" color="var(--primary)" /><PulseRing value={data.summary.energyScore} label="精力" color="var(--chart-2)" /><PulseRing value={data.summary.calmScore} label="低压感" color="var(--chart-3)" /></div><p className="mt-5 text-center text-sm text-muted-foreground">{data.summary.days} 天记录 · 已记录工时 {hoursText(data.summary.workMinutes)}</p>{!data.records.length && <p className="mt-2 text-center text-sm">还没有记录</p>}</div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">{[["本周工时",hoursText(data.week?.workMinutes)],["本月工时",hoursText(data.month?.workMinutes)],["平均下班",formatPulseTime(data.summary.averageEndMinute)],["最晚下班",formatPulseTime(data.summary.latestEndMinute)]].map(([label,value],index) => <div key={label} className="bg-card p-4">{index < 2 ? <CalendarDays className="size-4 text-primary-deep" /> : <Clock3 className="size-4 text-primary-deep" />}<p className="mt-3 text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></div>)}</div></div>
      <details className="border-t border-border px-5"><summary className="min-h-12 cursor-pointer py-3 text-sm font-medium">查看我的近 7 天记录</summary><ul className="divide-y divide-border">{data.records.map(row => <li key={row.day} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{row.day}</span><span>{pulseScore(row.energy,row.pressure)} / 100 · {hoursText(row.workMinutes)}</span></li>)}</ul></details>
    </SolidCard>
    <div className="grid items-start gap-6 lg:grid-cols-2"><CheckInForm key={userId + ":" + data.today + ":" + revision} data={data} refresh={() => report.refetch()} /><CompanyPulseDashboard /></div>
    <div className="rounded-lg border border-border p-4 text-sm"><p role="status">{message}</p>{confirmClear ? <div className="space-y-3"><p>清除全部个人打卡，并撤回公司统计参与。此操作不可恢复。</p><div className="flex flex-wrap gap-3"><SolidButton variant="risk" disabled={clearing} onClick={() => void clear()}>确认清除全部记录</SolidButton><SolidButton variant="secondary" disabled={clearing} onClick={() => setConfirmClear(false)}>取消</SolidButton></div></div> : <button className="min-h-11 text-muted-foreground underline" onClick={() => setConfirmClear(true)}>清除个人记录与统计授权</button>}<p className="mt-2 text-xs leading-6 text-muted-foreground">日期按北京时间，本周从周一开始；未填的工时和下班时间不估算。凌晨 0–6 点按工作日晚间顺序统计。Pulse 只反映自填工作体验，不是健康诊断或公司评级。</p></div>
  </>
}

export function PersonalPulseDashboard() {
  const { user, loading } = useAuth()
  if (loading) return <p role="status">正在加载…</p>
  return <div className="space-y-6">{user ? <PersonalReport key={user.id} userId={user.id} /> : <><SolidCard className="p-6"><h2 className="text-xl font-semibold">我的工作周报</h2><p className="my-3 text-sm text-muted-foreground">记录精力与压力，查看自己的工作节奏。</p><SolidButton asChild><Link href="/login?next=%2Fpulse">登录后记录今天</Link></SolidButton></SolidCard><CompanyPulseDashboard /></>}</div>
}
