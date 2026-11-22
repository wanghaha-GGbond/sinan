import { randomUUID } from "node:crypto"
import { eq, inArray } from "drizzle-orm"
import { expect, test } from "../release-fixture"
import { db } from "../../src/db/client"
import { users } from "../../src/db/schema/users"
import { dialogueApplications, dialogueAuditEvents, dialogueSessions } from "../../src/db/schema/dialogues"
import { signToken } from "../../src/lib/server/auth"

const people: string[] = [], events: string[] = []
test.afterAll(async () => {
  if (events.length) await db.delete(dialogueSessions).where(inArray(dialogueSessions.id, events))
  if (people.length) await db.delete(users).where(inArray(users.id, people))
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
  await page.getByRole("button", { name: "保存草稿", exact: true }).click()
  const card = page.getByTestId("managed-dialogue").filter({ has: page.getByRole("heading", { name: title, exact: true }) })
  await expect(card).toBeVisible()
  const [stored] = await db.select().from(dialogueSessions).where(eq(dialogueSessions.title, title))
  expect(stored).toBeTruthy(); events.push(stored.id)
  expect(stored.status).toBe("draft")
  expect((await request.get(`/api/dialogues/${stored.id}`)).status()).toBe(404)
  expect((await request.patch(`/api/moderation/dialogues/${stored.id}`, { headers: headers(applicantToken), data: { action: "publish" } })).status()).toBe(403)
  await card.getByRole("button", { name: "发布活动", exact: true }).click()
  await expect(card.getByRole("button", { name: "结束报名", exact: true })).toBeVisible()
  await card.getByText("参与安排（仅入选者可见）", { exact: true }).click()
  const privateInstructions = `PRIVATE-MEETING-${randomUUID()}`
  await card.getByLabel("参与安排", { exact: true }).fill(privateInstructions)
  const arrangementsSaved = page.waitForResponse(response => response.url().endsWith(`/api/moderation/dialogues/${stored.id}`) && response.request().method() === "PATCH" && response.ok())
  await card.getByRole("button", { name: "保存参与安排", exact: true }).click(); await arrangementsSaved
  await login(applicantToken)
  await page.goto(`/community/dialogues/${stored.id}`)
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible()
  const question = "我希望了解真实项目中跨团队协作的方式，PRIVATE-QUESTION。"
  await page.getByLabel("报名问题", { exact: true }).fill(question)
  await page.getByRole("button", { name: "免费报名", exact: true }).click()
  await expect(page.getByText("报名已提交，等待审核。", { exact: true })).toBeVisible()
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
  await expect(card.getByText(question, { exact: true })).toBeVisible()
  await card.getByLabel("处理说明（报名者可见）").fill("提问适合本场交流，确认入选")
  await card.getByRole("button", { name: "选为参与者", exact: true }).click()
  await expect(card.getByText("已入选", { exact: true })).toBeVisible()
  await login(applicantToken); await page.goto("/me/dialogues")
  await expect(page.getByText(privateInstructions, { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "撤回报名", exact: true }).click()
  await page.getByRole("button", { name: "确认撤回报名", exact: true }).click()
  await expect(page.getByText("报名问题已清除", { exact: true })).toBeVisible()
  await expect(page.getByText(privateInstructions, { exact: true })).toHaveCount(0)
  expect((await db.select().from(dialogueApplications).where(eq(dialogueApplications.id, application.id)))[0]).toMatchObject({ status: "withdrawn", question: "", decisionNote: null })
  // Real reapplication + account deletion must also purge private linkage.
  expect((await request.post(`/api/dialogues/${stored.id}/applications`, { headers: headers(applicantToken), data: { question, requestId: randomUUID() } })).status()).toBe(201)
  expect((await request.delete("/api/me/account", { headers: headers(applicantToken), data: { confirmation: "DELETE" } })).status()).toBe(200)
  expect(await db.select().from(dialogueApplications).where(eq(dialogueApplications.userId, applicant.id))).toHaveLength(0)
  expect(await db.select().from(dialogueAuditEvents).where(eq(dialogueAuditEvents.actorUserId, applicant.id))).toHaveLength(0)
  expect((await request.get("/api/me/dialogues", { headers: headers(applicantToken) })).status()).toBe(401)
  await login(outsiderToken); await page.goto("/moderation/dialogues"); await expect(page).toHaveURL(/\/community$/)
  await login(modToken); await page.goto("/moderation/dialogues")
  await card.getByRole("button", { name: "取消活动", exact: true }).click()
  await card.getByLabel("取消原因（将公开展示）").fill("隔离测试活动结束")
  await card.getByRole("button", { name: "确认取消活动", exact: true }).click()
  await expect(card.getByText(/^已取消/)).toBeVisible()
  expect((await request.get(`/api/dialogues/${stored.id}`).then(response => response.json())).session).toMatchObject({ status: "cancelled", cancelReason: "隔离测试活动结束" })
})
