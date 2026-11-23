import { randomUUID } from "node:crypto"
import type { Page } from "@playwright/test"
import { eq, inArray, or } from "drizzle-orm"
import { expect, test } from "../release-fixture"
import { db } from "../../src/db/client"
import { users } from "../../src/db/schema/users"
import { dialogueApplications, dialogueAuditEvents, dialogueSessions } from "../../src/db/schema/dialogues"
import { signToken } from "../../src/lib/server/auth"

const people: string[] = [], events: string[] = [], creationRequests: string[] = []
const uiRefresh = { timeout: 20_000 }

async function browserWrite(page: Page, step: string, method: "POST" | "PATCH" | "DELETE", path: string, trigger: () => Promise<unknown>, status: number, expected: Record<string, unknown>) {
  const started = Date.now()
  // Arm the observer before clicking. Never retry or ignore a failed write.
  const [response] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === path && response.request().method() === method, { timeout: 60_000 }),
    trigger(),
  ])
  const result = await response.json().catch(() => null)
  // Deliberately exclude bodies, headers, identities and private instructions.
  console.info(JSON.stringify({ event: "dialogue_write_response", step, method, status: response.status(), elapsedMs: Date.now() - started }))
  const error = typeof result?.error === "string" ? result.error.slice(0, 160) : "no API error message"
  expect(response.status(), step + " must return a real successful response: " + error).toBe(status)
  expect(result, step + " response contract").toMatchObject(expected)
  return result
}
test.afterAll(async () => {
  // Wait for any in-flight create holding its actor lock, then remove exactly
  // this test's request IDs, even if the subsequent UI assertion failed.
  if (people.length) await db.delete(users).where(inArray(users.id, people))
  if (events.length || creationRequests.length) await db.delete(dialogueSessions).where(or(events.length ? inArray(dialogueSessions.id, events) : undefined, creationRequests.length ? inArray(dialogueSessions.requestId, creationRequests) : undefined))
})

test("real dialogue story: draft, publish, private question, selection, withdrawal and account deletion", async ({ page, request, baseURL }) => {
  test.setTimeout(process.env.DATABASE_ADAPTER === "neon" ? 240_000 : 120_000)
  const created = await db.insert(users).values(["moderator", "user", "user"].map((role, i) => ({ email: `${randomUUID()}@dialogue.test`, displayName: `隔离对话用户${i}`, role: role as "moderator" | "user" }))).returning()
  people.push(...created.map(row => row.id))
  const [moderator, applicant, outsider] = created
  const modToken = await signToken({ userId: moderator.id, role: "moderator" }), applicantToken = await signToken({ userId: applicant.id, role: "user" }), outsiderToken = await signToken({ userId: outsider.id, role: "user" })
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` })
  const login = async (token: string) => {
    // Keep the shared release context, including its protected-preview proxy.
    await page.context().clearCookies({ name: "auth_token" })
    await page.context().addCookies([{ name: "auth_token", value: token, url: baseURL! }])
  }
  await login(modToken)
  await page.goto("/moderation/dialogues")
  await page.getByText("新建对话活动", { exact: true }).click()
  const title = `隔离访谈 ${randomUUID().slice(0, 8)}`
  await page.getByLabel("活动标题", { exact: true }).fill(title)
  await page.getByLabel("活动介绍", { exact: true }).fill("这是隔离测试中的工作经验交流，不代表真实嘉宾或已发布活动。")
  await page.getByLabel("嘉宾姓名或公开称呼").fill("隔离测试嘉宾")
  await page.getByLabel("嘉宾介绍", { exact: true }).fill("仅在隔离测试中验证活动流程与资料授权边界。")
  const localDate = (days: number) => new Date(Date.now() + days * 86400_000).toISOString().slice(0, 16)
  await page.getByLabel("开始时间（本机时区）").fill(localDate(4))
  await page.getByLabel("报名截止（本机时区）").fill(localDate(2))
  await page.getByRole("checkbox", { name: /已核对嘉宾身份/ }).check()
  const createForm = page.locator("form").filter({ has: page.getByRole("button", { name: "保存草稿", exact: true }) })
  await expect(createForm.locator(":invalid")).toHaveCount(0)
  const createPath = "/api/moderation/dialogues"
  page.on("request", request => {
    if (new URL(request.url()).pathname === createPath && request.method() === "POST") {
      const id = request.postDataJSON()?.requestId
      if (typeof id === "string" && /^[a-f0-9-]{36}$/.test(id)) creationRequests.push(id)
    }
  })
  const saved = await browserWrite(page, "save_draft", "POST", createPath,
    () => page.getByRole("button", { name: "保存草稿", exact: true }).click(), 201,
    { session: { id: expect.any(String), status: "draft" } })
  events.push(saved.session.id)
  const [stored] = await db.select().from(dialogueSessions).where(eq(dialogueSessions.id, saved.session.id))
  expect(stored).toMatchObject({ title, status: "draft", createdBy: moderator.id })
  const card = page.getByTestId("managed-dialogue").filter({ has: page.getByRole("heading", { name: title, exact: true }) })
  await expect(card).toBeVisible(uiRefresh)
  expect((await request.get(`/api/dialogues/${stored.id}`)).status()).toBe(404)
  expect((await request.patch(`/api/moderation/dialogues/${stored.id}`, { headers: headers(applicantToken), data: { action: "publish" } })).status()).toBe(403)
  const managementPath = `/api/moderation/dialogues/${stored.id}`
  await browserWrite(page, "publish", "PATCH", managementPath,
    () => card.getByRole("button", { name: "发布活动", exact: true }).click(), 200,
    { id: stored.id, status: "open" })
  const [published] = await db.select().from(dialogueSessions).where(eq(dialogueSessions.id, stored.id))
  expect(published).toMatchObject({ status: "open", guestConsentConfirmed: true })
  expect(published.publishedAt).not.toBeNull()
  await expect(card.getByRole("button", { name: "结束报名", exact: true })).toBeVisible(uiRefresh)
  await card.getByText("参与安排（仅入选者可见）", { exact: true }).click()
  const privateInstructions = `PRIVATE-MEETING-${randomUUID()}`
  await card.getByLabel("参与安排", { exact: true }).fill(privateInstructions)
  await browserWrite(page, "arrangements", "PATCH", managementPath,
    () => card.getByRole("button", { name: "保存参与安排", exact: true }).click(), 200,
    { id: stored.id, status: "open" })
  const [arranged] = await db.select().from(dialogueSessions).where(eq(dialogueSessions.id, stored.id))
  expect(arranged.privateInstructions).toBe(privateInstructions)
  await login(applicantToken)
  await page.goto(`/community/dialogues/${stored.id}`)
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible(uiRefresh)
  const question = "我希望了解真实项目中跨团队协作的方式，PRIVATE-QUESTION。"
  await page.getByLabel("报名问题", { exact: true }).fill(question)
  await browserWrite(page, "apply", "POST", `/api/dialogues/${stored.id}/applications`,
    () => page.getByRole("button", { name: "免费报名", exact: true }).click(), 201,
    { application: { id: expect.any(String), sessionId: stored.id, status: "submitted" } })
  await expect(page.getByText("报名已提交，等待审核。", { exact: true })).toBeVisible(uiRefresh)
  const [application] = await db.select().from(dialogueApplications).where(eq(dialogueApplications.userId, applicant.id))
  expect(application.question).toBe(question); expect(application.status).toBe("submitted")
  const publicResponse = await request.get(`/api/dialogues/${stored.id}`), publicText = await publicResponse.text()
  expect(publicResponse.headers()["cache-control"]).toContain("no-store")
  for (const secret of [question, privateInstructions, applicant.id, applicant.email!, moderator.id, "requestId", "createdBy", "privateInstructions"]) expect(publicText).not.toContain(secret)
  expect(JSON.parse(publicText).session).toMatchObject({ paymentsEnabled: false, biddingEnabled: false, donationStatus: "not_started" })
  expect((await request.get("/api/me/dialogues", { headers: headers(outsiderToken) }).then(response => response.json())).applications).toEqual([])
  expect((await request.get("/api/me/dialogues", { headers: headers(applicantToken) }).then(response => response.json())).applications[0].privateInstructions).toBeNull()
  expect((await request.get(`/api/moderation/dialogues/${stored.id}/applications`, { headers: headers(applicantToken) })).status()).toBe(403)
  await login(modToken); await page.goto("/moderation/dialogues")
  await card.getByText("审核报名", { exact: true }).click()
  await expect(card.getByText(question, { exact: true })).toBeVisible(uiRefresh)
  await card.getByLabel("处理说明（报名者可见）").fill("提问适合本场交流，确认入选")
  await browserWrite(page, "select", "PATCH", managementPath + `/applications/${application.id}`,
    () => card.getByRole("button", { name: "选为参与者", exact: true }).click(), 200,
    { id: application.id, status: "selected" })
  const [selected] = await db.select().from(dialogueApplications).where(eq(dialogueApplications.id, application.id))
  expect(selected.status).toBe("selected")
  await expect(card.getByText("已入选", { exact: true })).toBeVisible(uiRefresh)
  await login(applicantToken); await page.goto("/me/dialogues")
  await expect(page.getByText(privateInstructions, { exact: true })).toBeVisible(uiRefresh)
  await page.getByRole("button", { name: "撤回报名", exact: true }).click()
  await browserWrite(page, "withdraw", "DELETE", `/api/me/dialogues/${application.id}`,
    () => page.getByRole("button", { name: "确认撤回报名", exact: true }).click(), 200,
    { id: application.id, status: "withdrawn" })
  await expect(page.getByText("报名问题已清除", { exact: true })).toBeVisible(uiRefresh)
  await expect(page.getByText(privateInstructions, { exact: true })).toHaveCount(0)
  expect((await db.select().from(dialogueApplications).where(eq(dialogueApplications.id, application.id)))[0]).toMatchObject({ status: "withdrawn", question: "", decisionNote: null })
  // Real reapplication + account deletion must also purge private linkage.
  expect((await request.post(`/api/dialogues/${stored.id}/applications`, { headers: headers(applicantToken), data: { question, requestId: randomUUID() } })).status()).toBe(201)
  expect((await request.delete("/api/me/account", { headers: headers(applicantToken), data: { confirmation: "DELETE" } })).status()).toBe(200)
  expect(await db.select().from(dialogueApplications).where(eq(dialogueApplications.userId, applicant.id))).toHaveLength(0)
  expect(await db.select().from(dialogueAuditEvents).where(eq(dialogueAuditEvents.actorUserId, applicant.id))).toHaveLength(0)
  expect((await request.get("/api/me/dialogues", { headers: headers(applicantToken) })).status()).toBe(401)
  await login(outsiderToken); await page.goto("/moderation/dialogues"); await expect(page).toHaveURL(/\/community$/, uiRefresh)
  await login(modToken); await page.goto("/moderation/dialogues")
  await card.getByRole("button", { name: "取消活动", exact: true }).click()
  await card.getByLabel("取消原因（将公开展示）").fill("隔离测试活动结束")
  await browserWrite(page, "cancel", "PATCH", managementPath,
    () => card.getByRole("button", { name: "确认取消活动", exact: true }).click(), 200,
    { id: stored.id, status: "cancelled" })
  await expect(card.getByText(/^已取消/)).toBeVisible(uiRefresh)
  expect((await request.get(`/api/dialogues/${stored.id}`).then(response => response.json())).session).toMatchObject({ status: "cancelled", cancelReason: "隔离测试活动结束" })
})
