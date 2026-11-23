import { z } from "zod"

export const POINTS_LIMIT = 1_000_000
export const pointTasks = {
  verified_email: { title: "完成邮箱注册", points: 20 },
  daily_visit: { title: "今日来在场", points: 5 },
} as const
export const pointTaskInput = z.object({ task: z.enum(["verified_email", "daily_visit"]) }).strict()
export const pointBidInput = z.object({ requestId: z.uuid(), points: z.number().int().min(1).max(POINTS_LIMIT), question: z.string().trim().min(10).max(800) }).strict()
export const pointGrantInput = z.object({ campaignId: z.uuid(), email: z.email().trim().toLowerCase(), points: z.number().int().min(1).max(1000), reason: z.string().trim().min(4).max(120) }).strict()
export const pointsPolicy = { purchasable: false, transferable: false, redeemableForCash: false, donation: false } as const
export function pointsEnabled() { return process.env.NEXT_PUBLIC_POINTS_ENABLED === "true" }
export function pointTaskKey(task: keyof typeof pointTasks, now = new Date()) {
  // A server-controlled day, not a date supplied by the browser.
  const day = new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10)
  return task === "daily_visit" ? `task:daily_visit:${day}` : "task:verified_email:v1"
}
export type PointsWallet = {
  available: number; frozen: number; verified: boolean; policy: typeof pointsPolicy;
  tasks: Array<{ id: keyof typeof pointTasks; title: string; points: number; claimed: boolean }>;
  entries: Array<{ id: string; kind: string; availableDelta: number; frozenDelta: number; createdAt: string }>;
}
