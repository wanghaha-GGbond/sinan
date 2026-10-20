"use client"

import { useMemo, useState } from "react"
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Share2,
  TrendingUp,
  UsersRound,
} from "lucide-react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { toast } from "sonner"

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Slider } from "@/components/ui/slider"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"

const companyTrend = [
  { day: "周一", pulse: 68 },
  { day: "周二", pulse: 72 },
  { day: "周三", pulse: 64 },
  { day: "周四", pulse: 61 },
  { day: "周五", pulse: 70 },
  { day: "周六", pulse: 76 },
  { day: "周日", pulse: 74 },
  { day: "本周一", pulse: 69 },
  { day: "本周二", pulse: 66 },
  { day: "本周三", pulse: 71 },
  { day: "本周四", pulse: 73 },
  { day: "今天", pulse: 67 },
]

const chartConfig = {
  pulse: { label: "公司 Pulse", color: "#19c37d" },
}

function PulseRing({ value, label, detail, color }: { value: number; label: string; detail: string; color: string }) {
  const progress = Math.min(100, Math.max(0, value))

  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <div
        className="grid size-28 place-items-center rounded-full"
        style={{ background: `conic-gradient(${color} ${progress * 3.6}deg, var(--muted) 0deg)` }}
      >
        <div className="grid size-20 place-items-center rounded-full bg-card">
          <div>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
            <p className="text-[11px] text-muted-foreground">/ 100</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

export function CompanyPulseDashboard() {
  const [energy, setEnergy] = useState(7)
  const [pressure, setPressure] = useState(6)
  const [checkedIn, setCheckedIn] = useState(false)
  const dailyPulse = useMemo(() => Math.round(((energy + (11 - pressure)) / 20) * 100), [energy, pressure])

  function saveCheckIn() {
    const payload = { date: new Date().toISOString().slice(0, 10), energy, pressure, pulse: dailyPulse }
    setCheckedIn(true)
    try {
      window.localStorage.setItem("sinan:company-pulse:today", JSON.stringify(payload))
      toast.success("今天的 Pulse 已记录")
    } catch {
      // Blocked storage (private mode, embedded webview) must not kill the
      // interaction itself — the values stay valid for this visit only.
      toast.info("浏览器存储不可用，本次记录不会保存到明天")
    }
  }

  async function shareWeeklyPulse() {
    const text = "我正在体验在场 Company Pulse：每天用两个问题记录工作状态。"
    try {
      if (navigator.share) {
        await navigator.share({ title: "Company Pulse 周报", text })
      } else {
        await navigator.clipboard.writeText(text)
        toast.success("周报摘要已复制，可以配合截图分享")
      }
    } catch {
      // The native share sheet can be dismissed without an error state.
    }
  }

  return (
    <div className="space-y-7">
      <SolidCard variant="elevated" className="overflow-hidden p-0" data-testid="pulse-share-card">
        <div className="flex flex-col gap-3 border-b border-border bg-foreground px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-white/65">COMPANY PULSE · 示例周报</p>
            <h2 className="mt-1 text-xl font-semibold">工作周报视觉预览</h2>
          </div>
          <SolidButton type="button" variant="secondary" size="sm" onClick={shareWeeklyPulse}>
            <Share2 className="size-4" />
            分享本周 Pulse
          </SolidButton>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid grid-cols-3 gap-3">
            <PulseRing value={79} label="工作负荷" detail="47.5h / 目标 40h" color="#19c37d" />
            <PulseRing value={72} label="恢复度" detail="比上周 +6" color="#0ea5e9" />
            <PulseRing value={64} label="工作平衡" detail="连续 3 天改善" color="#f59e0b" />
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border">
            {[
              [Clock3, "本周工时", "47.5h"],
              [CalendarDays, "本月工时", "188h"],
              [Activity, "平均下班", "20:36"],
              [TrendingUp, "最晚一天", "23:18"],
            ].map(([Icon, label, value]) => {
              const MetricIcon = Icon as typeof Clock3
              return (
                <div key={String(label)} className="bg-card p-4">
                  <MetricIcon className="size-4 text-primary" />
                  <p className="mt-3 text-xs text-muted-foreground">{String(label)}</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{String(value)}</p>
                </div>
              )
            })}
          </div>
        </div>
      </SolidCard>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="border-y border-border py-6" aria-labelledby="daily-pulse-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">每天 10 秒</p>
              <h2 id="daily-pulse-title" className="mt-1 text-xl font-semibold text-foreground">今天工作得怎么样？</h2>
            </div>
            <div className="text-right">
              <p className="text-3xl font-semibold text-foreground">{dailyPulse}</p>
              <p className="text-xs text-muted-foreground">今日 Pulse</p>
            </div>
          </div>

          <div className="mt-6 space-y-7">
            <label className="block">
              <span className="flex items-center justify-between text-sm font-medium text-foreground">
                下班时还有多少精力？
                <span>{energy} / 10</span>
              </span>
              <Slider className="mt-4" min={1} max={10} step={1} value={[energy]} onValueChange={(value) => setEnergy(Array.isArray(value) ? (value[0] ?? 7) : value)} />
            </label>
            <label className="block">
              <span className="flex items-center justify-between text-sm font-medium text-foreground">
                今天的工作压力？
                <span>{pressure} / 10</span>
              </span>
              <Slider className="mt-4" min={1} max={10} step={1} value={[pressure]} onValueChange={(value) => setPressure(Array.isArray(value) ? (value[0] ?? 6) : value)} />
            </label>
          </div>

          <SolidButton type="button" variant="primary" className="mt-7 w-full" onClick={saveCheckIn}>
            {checkedIn ? <CheckCircle2 className="size-4" /> : <Activity className="size-4" />}
            {checkedIn ? "今天已记录" : "记录今天"}
          </SolidButton>
        </section>

        <section className="border-y border-border py-6" aria-labelledby="company-pulse-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                <UsersRound className="size-4" />
                示例：42 人匿名样本
              </p>
              <h2 id="company-pulse-title" className="mt-1 text-xl font-semibold text-foreground">示例公司 Company Pulse</h2>
              <p className="mt-1 text-sm text-muted-foreground">以下曲线用于体验交互，不代表真实公司或真实员工数据。</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-3xl font-semibold text-foreground">67</p>
              <p className="text-xs font-medium text-amber-600">较昨日 -6</p>
            </div>
          </div>

          <ChartContainer config={chartConfig} className="mt-5 h-64 w-full aspect-auto" initialDimension={{ width: 520, height: 256 }}>
            <LineChart data={companyTrend} margin={{ top: 8, right: 10, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={[50, 85]} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Line type="monotone" dataKey="pulse" stroke="var(--color-pulse)" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ChartContainer>

          <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
            隐私阈值：当天有效记录达到 30 人后才生成公司曲线；低于阈值时只显示“样本积累中”。
          </p>
        </section>
      </div>
    </div>
  )
}
