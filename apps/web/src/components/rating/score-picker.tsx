"use client"

import { useId } from "react"

export function ScorePicker({ label, value, onChange, optional = false }: { label: string; value?: number | null; onChange: (value: number | undefined) => void; optional?: boolean }) {
  const id = useId()
  if (optional) return <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
    <label htmlFor={id} className="text-sm font-medium">{label}<span className="sr-only">（选填）</span></label>
    <select id={id} value={value ?? ""} onChange={event => onChange(event.target.value === "" ? undefined : Number(event.target.value))} className="min-h-11 min-w-32 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40">
      <option value="">不了解 / 跳过</option>
      {Array.from({ length: 11 }, (_, score) => <option key={score} value={score}>{score} / 10{score === 0 ? " · 很差" : score === 10 ? " · 很好" : ""}</option>)}
    </select>
  </div>
  return <fieldset className="min-w-0 rounded-xl border border-border bg-card p-4">
    <legend className="px-1 text-sm font-semibold">{label} *</legend>
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
      {Array.from({ length: 11 }, (_, score) => <label key={score} className="relative cursor-pointer">
        <input type="radio" name={id} aria-label={`${label} ${score} 分`} checked={value === score} onChange={() => onChange(score)} className="peer absolute inset-0 size-full cursor-pointer opacity-0" />
        <span className="grid min-h-11 place-items-center rounded-md border border-border text-sm peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">{score}</span>
      </label>)}
    </div>
    <p className="mt-3 text-xs text-muted-foreground">{value == null ? "未评分" : `${value} / 10`} · 0 很差，10 很好</p>
  </fieldset>
}
