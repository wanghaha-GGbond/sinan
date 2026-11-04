import { z } from "zod"

export const pulseInput = z.object({
  energy: z.number().int().min(1).max(10),
  pressure: z.number().int().min(1).max(10),
  workMinutes: z.number().int().min(0).max(1440).nullable().default(null),
  endMinute: z.number().int().min(0).max(1439).nullable().default(null),
  companyId: z.uuid().nullable().default(null),
  shareWithCompany: z.boolean().default(false),
}).strict()

export type PulseRecord = { day: string; energy: number; pressure: number; workMinutes: number | null; endMinute?: number | null; companyId?: string | null }
export const PULSE_MIN_PARTICIPANTS = 30
export const PULSE_REPORT_DAYS = 14

export function shiftPulseDay(day: string, days: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86400_000).toISOString().slice(0, 10)
}

export function pulseWeekStart(day: string) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay()
  return shiftPulseDay(day, -(weekday === 0 ? 6 : weekday - 1))
}

export function formatPulseTime(minute: number | null | undefined) {
  return minute == null ? "—" : `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`
}

// Linear 0–100 scale: energy=1/pressure=10 is 0; the opposite is 100.
export function pulseScore(energy: number, pressure: number) {
  pulseInput.parse({ energy, pressure })
  return Math.round((energy - 1 + 10 - pressure) * 100 / 18)
}

export function pulseDay(now = new Date()) {
  // One fixed reporting timezone prevents timezone changes creating extra votes.
  return new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10)
}

export function summarizePulse(records: PulseRecord[]) {
  const endTimes = records.flatMap(r => r.endMinute == null ? [] : [r.endMinute < 360 ? r.endMinute + 1440 : r.endMinute])
  // After-midnight finishes belong to the late end of the workday, not its start.
  return {
    days: records.length,
    score: records.length ? Math.round(records.reduce((sum, r) => sum + pulseScore(r.energy, r.pressure), 0) / records.length) : null,
    energyScore: records.length ? Math.round(records.reduce((sum, r) => sum + (r.energy - 1) * 100 / 9, 0) / records.length) : null,
    calmScore: records.length ? Math.round(records.reduce((sum, r) => sum + (10 - r.pressure) * 100 / 9, 0) / records.length) : null,
    averageEndMinute: endTimes.length ? Math.round(endTimes.reduce((sum, value) => sum + value, 0) / endTimes.length) % 1440 : null,
    latestEndMinute: endTimes.length ? Math.max(...endTimes) % 1440 : null,
    workMinutes: records.some(r => r.workMinutes !== null)
      ? records.reduce((sum, r) => sum + (r.workMinutes ?? 0), 0) : null,
  }
}

export type PublicPulsePoint = { day: string; score: number; participants: "30–49" | "50–99" | "100+" }
/** Defense in depth: never send low-count rows, precise counts or raw averages. */
export function publicPulsePoints(rows: { day: string; participants: unknown; score: unknown }[]): PublicPulsePoint[] {
  return rows.flatMap(row => {
    const count = Number(row.participants), score = Number(row.score)
    if (!Number.isInteger(count) || count < PULSE_MIN_PARTICIPANTS || !Number.isFinite(score) || score < 0 || score > 100) return []
    return [{ day: row.day, score: Math.round(score / 5) * 5, participants: count < 50 ? "30–49" as const : count < 100 ? "50–99" as const : "100+" as const }]
  })
}
