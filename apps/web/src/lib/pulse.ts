import { z } from "zod"

export const pulseInput = z.object({
  energy: z.number().int().min(1).max(10),
  pressure: z.number().int().min(1).max(10),
  workMinutes: z.number().int().min(0).max(1440).nullable().default(null),
}).strict()

export type PulseRecord = z.infer<typeof pulseInput> & { day: string }

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
  if (!records.length) return { days: 0, score: null, workMinutes: null }
  return {
    days: records.length,
    score: Math.round(records.reduce((sum, r) => sum + pulseScore(r.energy, r.pressure), 0) / records.length),
    workMinutes: records.some(r => r.workMinutes !== null)
      ? records.reduce((sum, r) => sum + (r.workMinutes ?? 0), 0) : null,
  }
}
