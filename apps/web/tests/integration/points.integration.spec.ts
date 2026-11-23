import { randomUUID } from "node:crypto"
import { and, eq, inArray, sql } from "drizzle-orm"
import { expect, test } from "../database-fixture"
import { db } from "../../src/db/client"
import { users } from "../../src/db/schema/users"
import { pointAccounts, pointEntries } from "../../src/db/schema/points"
import { dialogueSessions, dialogueApplications } from "../../src/db/schema/dialogues"
import { claimPointTask, getPointsWallet, grantActivityPoints, placePointBid, settlePointAuction } from "../../src/lib/server/points-service"
import { createDialogue, manageDialogue, getDialogue, applyForDialogue, withdrawDialogue, decideDialogue } from "../../src/lib/server/dialogue-service"

const people: string[] = [], events: string[] = []
const flags = ["NEXT_PUBLIC_DIALOGUE_ENABLED", "DIALOGUE_ENABLED", "NEXT_PUBLIC_POINTS_ENABLED", "POINTS_ENABLED"] as const
let previous: Array<string | undefined>
test.beforeEach(() => { previous = flags.map(key => process.env[key]); flags.forEach(key => { process.env[key] = "true" }) })
test.afterEach(async () => {
  if (events.length) await db.delete(dialogueSessions).where(inArray(dialogueSessions.id, events))
  if (people.length) await db.delete(users).where(inArray(users.id, people))
  people.length = events.length = 0
  flags.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i] })
})
async function fixture() {
  const [first, second, moderator] = await db.insert(users).values(["user", "user", "moderator"].map(role => ({ email: `${randomUUID()}@points.test`, role: role as "user" | "moderator", emailVerifiedAt: new Date() }))).returning()
  people.push(first.id, second.id, moderator.id)
  const data = { requestId: randomUUID(), title: "隔离积分工作对话", description: "用于验证积分冻结与退回的隔离测试对话，不涉及真实货币。", guestName: "测试嘉宾", guestBio: "在隔离测试中验证资料授权与竞拍规则。", durationMinutes: 45, capacity: 1, startsAt: new Date(Date.now() + 4 * 86400_000).toISOString(), signupEndsAt: new Date(Date.now() + 2 * 86400_000).toISOString(), guestConsentConfirmed: true, selectionMode: "points" as const, minBidPoints: 1 }
  const event = await createDialogue(moderator.id, data); events.push(event.id)
  await manageDialogue(moderator.id, event.id, { action: "publish" })
  return { first, second, moderator, data, event }
}
const offer = (points: number) => ({ requestId: randomUUID(), points, question: "想了解真实工作中的项目安排和跨团队协作？" })
async function end(id: string) { await db.update(dialogueSessions).set({ signupEndsAt: new Date(Date.now() - 60_000) }).where(eq(dialogueSessions.id, id)) }
async function balances(userId: string) { return (await db.select().from(pointAccounts).where(eq(pointAccounts.userId, userId)))[0] }

test("concurrent task claims award once and preserve an auditable balance", async () => {
  const f = await fixture()
  const results = await Promise.all([claimPointTask(f.first.id, "verified_email"), claimPointTask(f.first.id, "verified_email")])
  expect(results.map(row => row.awarded).sort((a, b) => a - b)).toEqual([0, 20])
  await claimPointTask(f.first.id, "daily_visit"); await claimPointTask(f.first.id, "daily_visit")
  expect(await balances(f.first.id)).toMatchObject({ available: 25, frozen: 0 })
  expect((await getPointsWallet(f.first.id)).entries).toHaveLength(2)
  expect((await getPointsWallet(f.second.id)).entries).toEqual([])
})
test("activity grants need current moderator and verified recipient, and cannot repeat a campaign", async () => {
  const f = await fixture(), reward = { campaignId: randomUUID(), email: f.first.email!, points: 10, reason: "真实活动参与奖励" }
  await expect(grantActivityPoints(f.second.id, reward)).rejects.toMatchObject({ status: 403 })
  expect((await grantActivityPoints(f.moderator.id, reward)).awarded).toBe(10)
  expect((await grantActivityPoints(f.moderator.id, reward)).awarded).toBe(0)
  await expect(grantActivityPoints(f.moderator.id, { ...reward, points: 11 })).rejects.toMatchObject({ status: 409 })
  await db.update(users).set({ emailVerifiedAt: null }).where(eq(users.id, f.first.id))
  await expect(claimPointTask(f.first.id, "verified_email")).rejects.toMatchObject({ status: 403 })
  await expect(placePointBid(f.first.id, f.event.id, offer(1))).rejects.toMatchObject({ status: 403 })
})
test("one balance cannot fund two auctions; retries and raises do not double-freeze", async () => {
  const f = await fixture(); await claimPointTask(f.first.id, "verified_email")
  const other = await createDialogue(f.moderator.id, { ...f.data, requestId: randomUUID() }); events.push(other.id)
  await manageDialogue(f.moderator.id, other.id, { action: "publish" })
  const a = offer(15), b = offer(15)
  const result = await Promise.allSettled([placePointBid(f.first.id, f.event.id, a), placePointBid(f.first.id, other.id, b)])
  expect(result.filter(row => row.status === "fulfilled")).toHaveLength(1)
  expect(await balances(f.first.id)).toMatchObject({ available: 5, frozen: 15 })
  const id = result[0].status === "fulfilled" ? f.event.id : other.id, original = id === f.event.id ? a : b
  await placePointBid(f.first.id, id, original)
  expect(await balances(f.first.id)).toMatchObject({ available: 5, frozen: 15 })
  await placePointBid(f.first.id, id, offer(18))
  expect(await balances(f.first.id)).toMatchObject({ available: 2, frozen: 18 })
  await expect(placePointBid(f.first.id, id, original)).rejects.toMatchObject({ status: 409 })
  await expect(placePointBid(f.first.id, id, offer(19.5))).rejects.toThrow()
})
test("blind bids stay private and cannot bypass points through free or manual selection", async () => {
  const f = await fixture(); await claimPointTask(f.first.id, "verified_email")
  const input = offer(15), bid = await placePointBid(f.first.id, f.event.id, input)
  await expect(applyForDialogue(f.second.id, f.event.id, { question: input.question, requestId: randomUUID() })).rejects.toMatchObject({ status: 409 })
  await expect(decideDialogue(f.moderator.id, f.event.id, bid.id, { status: "selected", expectedStatus: "submitted", reason: "人工改选绕过积分" })).rejects.toMatchObject({ status: 409 })
  const view = await getDialogue(f.event.id), json = JSON.stringify(view)
  expect(view).toMatchObject({ pointsBiddingEnabled: true, paymentsEnabled: false, biddingEnabled: false, donationStatus: "not_started" })
  for (const value of [f.first.id, f.first.email!, input.question, "bidPoints", "pointsState"]) expect(json).not.toContain(value)
  await expect(settlePointAuction(f.moderator.id, f.event.id)).rejects.toMatchObject({ status: 409 })
})
test("highest bid wins once, losers and cancelled winner recover their balances", async () => {
  const f = await fixture()
  await claimPointTask(f.first.id, "verified_email"); await claimPointTask(f.second.id, "verified_email")
  const a = await placePointBid(f.first.id, f.event.id, offer(12)), b = await placePointBid(f.second.id, f.event.id, offer(18))
  await end(f.event.id)
  await Promise.all([settlePointAuction(f.moderator.id, f.event.id), settlePointAuction(f.moderator.id, f.event.id)])
  expect(await balances(f.first.id)).toMatchObject({ available: 20, frozen: 0 })
  expect(await balances(f.second.id)).toMatchObject({ available: 2, frozen: 0 })
  expect((await db.select().from(dialogueApplications).where(eq(dialogueApplications.id, b.id)))[0]).toMatchObject({ status: "selected", pointsState: "spent" })
  expect((await db.select().from(dialogueApplications).where(eq(dialogueApplications.id, a.id)))[0]).toMatchObject({ status: "not_selected", pointsState: "released" })
  expect(await db.select().from(pointEntries).where(and(eq(pointEntries.userId, f.second.id), eq(pointEntries.kind, "spend")))).toHaveLength(1)
  await manageDialogue(f.moderator.id, f.event.id, { action: "cancel", reason: "嘉宾临时取消活动" })
  expect(await balances(f.second.id)).toMatchObject({ available: 20, frozen: 0 })
})
test("tie uses effective bid time; blocked accounts never win", async () => {
  const f = await fixture()
  await claimPointTask(f.first.id, "verified_email"); await claimPointTask(f.second.id, "verified_email")
  const a = await placePointBid(f.first.id, f.event.id, offer(15)); await placePointBid(f.second.id, f.event.id, offer(15))
  await db.update(dialogueApplications).set({ bidPlacedAt: new Date(Date.now() - 60_000) }).where(eq(dialogueApplications.id, a.id))
  await end(f.event.id); await settlePointAuction(f.moderator.id, f.event.id)
  expect((await db.select().from(dialogueApplications).where(eq(dialogueApplications.id, a.id)))[0].status).toBe("selected")
  const event = await createDialogue(f.moderator.id, { ...f.data, requestId: randomUUID() }); events.push(event.id)
  await manageDialogue(f.moderator.id, event.id, { action: "publish" })
  await placePointBid(f.second.id, event.id, offer(15))
  await db.update(users).set({ status: "suspended" }).where(eq(users.id, f.second.id))
  await end(event.id); await settlePointAuction(f.moderator.id, event.id)
  expect(await balances(f.second.id)).toMatchObject({ available: 20, frozen: 0 })
})
test("withdrawal refunds once; emergency cancellation still refunds with points off", async () => {
  const f = await fixture(); await claimPointTask(f.first.id, "verified_email")
  const a = await placePointBid(f.first.id, f.event.id, offer(12))
  await withdrawDialogue(f.first.id, a.id); await withdrawDialogue(f.first.id, a.id)
  expect(await balances(f.first.id)).toMatchObject({ available: 20, frozen: 0 })
  expect((await db.select().from(dialogueApplications).where(eq(dialogueApplications.id, a.id)))[0]).toMatchObject({ question: "", pointsState: "released" })
  await placePointBid(f.first.id, f.event.id, offer(14))
  process.env.POINTS_ENABLED = "false"
  await expect(getDialogue(f.event.id)).rejects.toMatchObject({ status: 404 })
  await manageDialogue(f.moderator.id, f.event.id, { action: "cancel", reason: "暂停试点退回积分" })
  expect(await balances(f.first.id)).toMatchObject({ available: 20, frozen: 0 })
  const [sum] = await db.select({ available: sql<number>`sum(${pointEntries.availableDelta})::int`, frozen: sql<number>`sum(${pointEntries.frozenDelta})::int` }).from(pointEntries).where(eq(pointEntries.userId, f.first.id))
  expect(sum).toEqual({ available: 20, frozen: 0 })
})
