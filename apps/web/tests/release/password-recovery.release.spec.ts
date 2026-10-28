import { randomUUID } from "node:crypto"
import { eq, sql } from "drizzle-orm"
import { authorizedReleaseRequest, expect, test } from "../release-fixture"
import { db } from "../../src/db/client"
import { users } from "../../src/db/schema/users"
import { passwordResetTokens } from "../../src/db/schema/password-reset-tokens"
import { hashPassword, signToken } from "../../src/lib/server/auth"
import { createPasswordResetToken, hashPasswordResetToken } from "../../src/lib/server/password-recovery-policy"

const testClientId = randomUUID().replaceAll("-", "")
test.use({ viewport: { width: 390, height: 844 }, extraHTTPHeaders: {
  "cf-connecting-ip": `2001:db8:${testClientId.slice(0, 4)}:${testClientId.slice(4, 8)}::1`,
} })

test("password recovery works in the browser and revokes old sessions", async ({ page }, testInfo) => {
  const request = authorizedReleaseRequest(page.request)
  const email = `recovery-e2e-${randomUUID()}@integration.sinan.test`
  const [user] = await db.insert(users).values({ email, passwordHash: await hashPassword("BeforeReset123!") }).returning({ id: users.id })
  try {
    const oldJwt = await signToken({ userId: user.id, role: "user" })
    const token = createPasswordResetToken()
    await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash: hashPasswordResetToken(token),
      sessionVersion: 0, expiresAt: sql`clock_timestamp() + interval '15 minutes'` })

    await page.goto("/login")
    await page.getByRole("link", { name: "忘记密码？" }).click()
    await expect(page.getByLabel("注册邮箱")).toBeVisible()
    await page.goto(`/reset-password#token=${token}`)
    await expect(page.getByLabel("新密码", { exact: true })).toBeVisible()
    await expect(page).toHaveURL(/\/reset-password$/)
    await page.getByLabel("新密码", { exact: true }).fill("AfterReset123!")
    await page.getByLabel("确认密码").fill("Mismatch123!")
    await page.getByRole("button", { name: "保存新密码" }).click()
    await expect(page.getByRole("alert").filter({ hasText: "两次密码不一致" })).toBeVisible()
    await page.getByLabel("确认密码").fill("AfterReset123!")
    await expect(page.getByText("两次密码不一致", { exact: true })).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath("reset-password-mobile.png"), fullPage: true })
    await page.getByRole("button", { name: "保存新密码" }).click()
    await expect(page.getByRole("heading", { name: "密码已更新" })).toBeVisible()

    const replay = await request.post("/api/auth/reset-password", { data: { token, password: "OtherPassword123!" } })
    expect(replay.status()).toBe(400)
    const oldSession = await request.get("/api/auth/me", { headers: { authorization: `Bearer ${oldJwt}` } })
    expect((await oldSession.json()).user).toBeNull()
    expect((await request.post("/api/auth/login", { data: { email, password: "BeforeReset123!" } })).status()).toBe(401)
    expect((await request.post("/api/auth/login", { data: { email, password: "AfterReset123!" } })).status()).toBe(200)
    expect((await (await request.get("/api/auth/me")).json()).user.id).toBe(user.id)
  } finally {
    await db.delete(users).where(eq(users.id, user.id))
  }
})

test("recovery form shows delivery errors and missing links without fake success", async ({ page, context }, testInfo) => {
  // UI-only mail failure simulation; no external email service is contacted.
  // Register after the Preview proxy at the same interception level so the
  // mock wins without overlapping page/context interception during navigation.
  await context.route("**/api/auth/forgot-password", (route) => route.fulfill({ status: 503,
    json: { error: "邮件找回暂不可用，请稍后再试" } }))
  await page.goto("/forgot-password")
  await page.getByLabel("注册邮箱").fill("person@integration.sinan.test")
  await page.getByRole("button", { name: "发送重置链接" }).click()
  await expect(page.getByRole("alert").filter({ hasText: "邮件找回暂不可用" })).toBeVisible()
  await expect(page.getByText("如果该邮箱已注册，会收到重置链接。")).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath("forgot-password-mobile.png"), fullPage: true })
  await page.goto("/reset-password")
  await expect(page.getByText("链接无效，请重新申请。")).toBeVisible()
  await expect(page.getByRole("button", { name: "保存新密码" })).toHaveCount(0)
})
