import { test, expect } from "@playwright/test"
import { pulseDay, pulseInput, pulseScore, summarizePulse, publicPulsePoints, pulseWeekStart, formatPulseTime } from "../src/lib/pulse"

test("Pulse score uses the entire scale and validates inputs", () => {
  expect(pulseScore(1, 10)).toBe(0)
  expect(pulseScore(10, 1)).toBe(100)
  expect(pulseScore(5, 5)).toBe(50)
  expect(() => pulseScore(11, 5)).toThrow()
  expect(() => pulseScore(NaN, 5)).toThrow()
})
test("only server-assigned dates and identities are accepted", () => {
  expect(pulseInput.safeParse({ energy: 3, pressure: 4, userId: "other" }).success).toBe(false)
  expect(pulseInput.safeParse({ energy: 3, pressure: 4, day: "2020-01-01" }).success).toBe(false)
  expect(pulseInput.safeParse({ energy: 3, pressure: 4, workMinutes: 1441 }).success).toBe(false)
  expect(pulseInput.safeParse({ energy: 3.5, pressure: 4 }).success).toBe(false)
})
test("reporting timezone has a deterministic midnight boundary", () => {
  expect(pulseDay(new Date("2026-11-02T15:59:59Z"))).toBe("2026-11-02")
  expect(pulseDay(new Date("2026-11-02T16:00:00Z"))).toBe("2026-11-03")
})
test("no records or missing hours never become fabricated statistics", () => {
  expect(summarizePulse([])).toEqual({ days: 0, score: null, workMinutes: null, energyScore: null, calmScore: null, averageEndMinute: null, latestEndMinute: null })
  expect(summarizePulse([{ day: "2026-11-03", energy: 1, pressure: 10, workMinutes: null }])).toMatchObject({ days: 1, score: 0, workMinutes: null, energyScore: 0, calmScore: 0 })
  expect(summarizePulse([{ day: "2026-11-03", energy: 10, pressure: 1, workMinutes: 0 }])).toMatchObject({ days: 1, score: 100, workMinutes: 0, energyScore: 100, calmScore: 100 })
})

test("company threshold and output precision are enforced before serialization", () => {
  expect(publicPulsePoints([{ day: "2026-11-01", participants: 29, score: 77 }])).toEqual([])
  expect(publicPulsePoints([{ day: "2026-11-01", participants: 30, score: 77 }])).toEqual([{ day: "2026-11-01", participants: "30–49", score: 75 }])
  expect(publicPulsePoints([{ day: "2026-11-01", participants: 30, score: NaN }])).toEqual([])
  expect(pulseWeekStart("2026-11-01")).toBe("2026-10-26")
  const result = summarizePulse([{ day: "2026-11-01", energy: 5, pressure: 5, workMinutes: null, endMinute: 23*60 }, { day: "2026-11-02", energy: 5, pressure: 5, workMinutes: null, endMinute: 60 }])
  expect(formatPulseTime(result.averageEndMinute)).toBe("00:00")
  expect(formatPulseTime(result.latestEndMinute)).toBe("01:00")
})
