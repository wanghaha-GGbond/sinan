import { randomUUID } from "node:crypto"
import { eq, inArray } from "drizzle-orm"
import { expect, test } from "../release-fixture"
import { db } from "../../src/db/client"
import { users } from "../../src/db/schema/users"
import { dialogueSessions, dialogueApplications } from "../../src/db/schema/dialogues"
import { pointAccounts, pointEntries } from "../../src/db/schema/points"
import { signToken } from "../../src/lib/server/auth"

const people: string[] = [], events: string[] = []
test.afterAll(async () => {
  if (people.length) await db.delete(users).where(inArray(users.id, people))
  if (events.length) await db.delete(dialogueSessions).where(inArray(dialogueSessions.id, events))
})
test("real earned-points story: claim, blind bid, withdraw, settle, cancellation refund and deletion", async ({ page, request, baseURL }) => {
  test.setTimeout(process.env.DATABASE_ADAPTER === "neon" ? 240_000 : 120_000)
  const [moderator, applicant] = await db.insert(users).values(["moderator", "user"].map(role => ({ role: role as "moderator" | "user", email: `${randomUUID()}@points.test`, emailVerifiedAt: new Date() }))).returning()
  people.push(moderator.id, applicant.id)
  const modToken = await signToken({ userId: moderator.id, role: "moderator" }), token = await signToken({ userId: applicant.id, role: "user" })
  const modHeaders = { Authorization: `Bearer ${modToken}` }, headers = { Authorization: `Bearer ${token}` }
  const login = async (authToken: string) => { await page.context().clearCookies({ name: "auth_token" }); await page.context().addCookies([{ name: "auth_token", value: authToken, url: baseURL! }]) }
  const title = `隔离积分对话 ${randomUUID().slice(0, 8)}`
  const creation = await request.post("/api/moderation/dialogues", { headers: modHeaders, data: { requestId: randomUUID(), title, description: "仅用于隔离数据库中的积分竞拍验收，不代表真实已发布活动。", guestName: "隔离测试嘉宾", guestBio: "仅验证资料授权及报名积分流程的隔离测试嘉宾。", durationMinutes: 45, capacity: 1, startsAt: new Date(Date.now() + 4 * 86400_000).toISOString(), signupEndsAt: new Date(Date.now() + 2 * 86400_000).toISOString(), guestConsentConfirmed: true, selectionMode: "points", minBidPoints: 1 } })
  expect(creation.status()).toBe(201)
  const id = (await creation.json()).session.id; events.push(id)
  expect((await request.patch(`/api/moderation/dialogues/${id}`, { headers: modHeaders, data: { action: "publish" } })).status()).toBe(200)
  await login(token); await page.goto("/me/points")
  await expect(page.getByTestId("points-available")).toHaveText("0", { timeout: 20_000 })
  const [claim] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === "/api/me/points/claim" && r.request().method() === "POST", { timeout: 60_000 }), page.getByRole("button", { name: "完成邮箱注册领取积分", exact: true }).click()])
  expect(claim.status()).toBe(200)
  await expect(page.getByTestId("points-available")).toHaveText("20", { timeout: 20_000 })
  expect((await request.post("/api/me/points/claim", { headers, data: { task: "verified_email" } }).then(r => r.json())).awarded).toBe(0)
  await page.goto(`/community/dialogues/${id}`)
  await page.getByLabel("本次出价（积分）", { exact: true }).fill("12")
  const question = "希望了解真实工作中的跨团队沟通及项目协作方式？"
  await page.getByLabel("想聊的问题", { exact: true }).fill(question)
  const [bid] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === `/api/dialogues/${id}/points-bids` && r.request().method() === "POST", { timeout: 60_000 }), page.getByRole("button", { name: "确认出价并冻结积分", exact: true }).click()])
  expect(bid.status()).toBe(201)
  const application = (await bid.json()).application
  await expect(page.getByText(/出价已记录，积分已冻结/)).toBeVisible({ timeout: 20_000 })
  expect((await db.select().from(pointAccounts).where(eq(pointAccounts.userId, applicant.id)))[0]).toMatchObject({ available: 8, frozen: 12 })
  const publicText = await request.get(`/api/dialogues/${id}`).then(r => r.text())
  for (const secret of [applicant.id, applicant.email!, question, "bidPoints", "pointsState"]) expect(publicText).not.toContain(secret)
  expect(JSON.parse(publicText).session).toMatchObject({ pointsBiddingEnabled: true, paymentsEnabled: false, donationStatus: "not_started" })
  expect((await request.post(`/api/dialogues/${id}/points-bids`, { headers, data: { requestId: randomUUID(), points: 21, question } })).status()).toBe(409)
  expect((await request.delete(`/api/me/dialogues/${application.id}`, { headers })).status()).toBe(200)
  expect((await request.get("/api/me/points", { headers }).then(r => r.json()))).toMatchObject({ available: 20, frozen: 0 })
  expect((await request.post(`/api/dialogues/${id}/points-bids`, { headers, data: { requestId: randomUUID(), points: 14, question } })).status()).toBe(201)
  await db.update(dialogueSessions).set({ signupEndsAt: new Date(Date.now() - 60_000) }).where(eq(dialogueSessions.id, id))
  await login(modToken); await page.goto("/moderation/dialogues")
  const card = page.getByTestId("managed-dialogue").filter({ has: page.getByRole("heading", { name: title, exact: true }) })
  const [settled] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === `/api/moderation/dialogues/${id}/points-settle` && r.request().method() === "POST", { timeout: 60_000 }), card.getByRole("button", { name: "按积分确认中选", exact: true }).click()])
  expect(settled.status()).toBe(200)
  await expect(card.getByText(/积分结果已确认/)).toBeVisible({ timeout: 20_000 })
  expect((await db.select().from(pointAccounts).where(eq(pointAccounts.userId, applicant.id)))[0]).toMatchObject({ available: 6, frozen: 0 })
  expect((await db.select().from(dialogueApplications).where(eq(dialogueApplications.id, application.id)))[0]).toMatchObject({ status: "selected", pointsState: "spent" })
  expect((await request.patch(`/api/moderation/dialogues/${id}`, { headers: modHeaders, data: { action: "cancel", reason: "隔离测试结束取消活动" } })).status()).toBe(200)
  expect((await request.get("/api/me/points", { headers }).then(r => r.json()))).toMatchObject({ available: 20, frozen: 0 })
  expect((await request.delete("/api/me/account", { headers, data: { confirmation: "DELETE" } })).status()).toBe(200)
  expect(await db.select().from(pointAccounts).where(eq(pointAccounts.userId, applicant.id))).toHaveLength(0)
  expect(await db.select().from(pointEntries).where(eq(pointEntries.userId, applicant.id))).toHaveLength(0)
  expect((await request.get("/api/me/points", { headers })).status()).toBe(401)
})
