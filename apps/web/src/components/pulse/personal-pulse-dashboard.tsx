"use client"

import Link from "next/link"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-context"
import { pulseScore, type PulseRecord, type summarizePulse } from "@/lib/pulse"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"

type Report = { today: string; records: PulseRecord[]; summary: ReturnType<typeof summarizePulse> }

export function PersonalPulseDashboard() {
  const { user, loading } = useAuth()
  const [energy, setEnergy] = useState("")
  const [pressure, setPressure] = useState("")
  const [hours, setHours] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const report = useQuery<Report>({
    queryKey: ["personal-pulse", user?.id], enabled: !!user,
    queryFn: async () => {
      const response = await fetch("/api/me/pulse", { cache: "no-store" })
      if (!response.ok) throw new Error("记录加载失败")
      return response.json()
    },
  })

  async function save() {
    if (!energy || !pressure || saving) return
    setSaving(true); setMessage("")
    try {
      const response = await fetch("/api/me/pulse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ energy: Number(energy), pressure: Number(pressure), workMinutes: hours === "" ? null : Math.round(Number(hours) * 60) }),
      })
      if (!response.ok) throw new Error((await response.json()).error ?? "保存失败")
      setMessage("今天的记录已保存")
      await report.refetch()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败，请重试")
    } finally { setSaving(false) }
  }

  async function share() {
    const summary = report.data?.summary
    if (!summary || summary.score === null) return
    const text = `我的在场 Pulse：近 7 天记录 ${summary.days} 天，平均 ${summary.score}/100。`
    try {
      if (navigator.share) await navigator.share({ title: "我的 Pulse", text })
      else { await navigator.clipboard.writeText(text); setMessage("周报摘要已复制") }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setMessage("分享失败，请重试")
    }
  }

  if (loading) return <p role="status">正在加载…</p>
  if (!user) return <Link className="underline" href="/login?next=%2Fpulse">登录后记录今天</Link>
  return <div className="grid gap-6 lg:grid-cols-2">
    <SolidCard className="p-5">
      <h2 className="text-xl font-semibold">今天工作得怎么样？</h2>
      <p className="mt-2 text-sm text-muted-foreground">个人记录仅自己可见；日期按北京时间，每天可更新。</p>
      <form className="mt-6 space-y-5" onSubmit={event => { event.preventDefault(); void save() }}>
        {([["下班时还有多少精力？", energy, setEnergy], ["今天的工作压力？", pressure, setPressure]] as const).map(([label, value, setter]) => <label key={label} className="block space-y-2">
          <span>{label}</span>
          <select required className="block min-h-11 w-full rounded-lg border bg-card px-3" value={value} onChange={event => setter(event.target.value)}>
            <option value="">请选择</option>{Array.from({ length: 10 }, (_, i) => <option key={i} value={i + 1}>{i + 1} / 10</option>)}
          </select>
        </label>)}
        <label className="block space-y-2"><span>工作时长（小时，选填）</span><input className="block min-h-11 w-full rounded-lg border px-3" type="number" min="0" max="24" step="0.25" value={hours} onChange={e => setHours(e.target.value)} /></label>
        <SolidButton type="submit" disabled={saving || !energy || !pressure}>{saving ? "正在保存…" : "保存今天"}</SolidButton>
      </form>
      <p role="status" className="mt-3 text-sm">{message}</p>
    </SolidCard>
    <SolidCard className="p-5" data-testid="pulse-share-card">
      <h2 className="text-xl font-semibold">近 7 天</h2>
      {report.isPending ? <p role="status">正在加载…</p> : report.isError ? <div role="alert">记录加载失败 <button type="button" onClick={() => void report.refetch()}>重试</button></div> : <>
        <p className="my-5 text-4xl font-semibold">{report.data.summary.score ?? "—"}<span className="text-sm"> / 100</span></p>
        <p>{report.data.summary.days} 天记录 · 已记录工时 {report.data.summary.workMinutes === null ? "—" : `${(report.data.summary.workMinutes / 60).toFixed(1)}h`}</p>
        {!report.data.records.length && <p className="mt-4 text-muted-foreground">还没有记录</p>}
        <ul className="my-5 divide-y">{report.data.records.map(row => <li key={row.day} className="flex justify-between py-3"><span>{row.day}</span><span>{pulseScore(row.energy, row.pressure)} / 100</span></li>)}</ul>
        <SolidButton type="button" disabled={!report.data.records.length} onClick={() => void share()}>分享我的周报</SolidButton>
      </>}
    </SolidCard>
  </div>
}
