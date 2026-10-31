import { expect, test } from "@playwright/test"

for (const inviteRequired of [true, false]) {
test(`email registration opens from mobile navigation and lands on an editable personal page (invite=${inviteRequired})`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 900 })
  const user = { id: "account-fixture", displayName: "新用户", role: "user", trustLevel: 0 }
  let registered: Record<string, unknown> | undefined
  let saved: Record<string, unknown> | undefined
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: { user: null } }))
  await page.route("**/api/config/register", (route) => route.fulfill({ json: { inviteRequired, emailDeliveryAvailable: true } }))
  await page.route("**/api/auth/register-code", async (route) => {
    expect(route.request().postDataJSON()).toEqual({ email: "person@example.test", ...(inviteRequired ? { inviteCode: "TESTABCD" } : {}) })
    await route.fulfill({ status: 202, json: { message: "验证码已发送", retryAfter: 60 } })
  })
  await page.route("**/api/auth/register", (route) => {
    registered = route.request().postDataJSON()
    return route.fulfill({ status: 201, json: { user } })
  })
  await page.route("**/api/me", (route) => route.fulfill({ json: {
    user: { ...user, reputationScore: 0 }, stats: { directionPoints: 0, nextLevelPoints: 100, streakDays: 0, helpedCount: 0 },
    dailyTasks: [], badges: [], myReviews: [], favoriteCompanies: [], verifications: [], invites: { total: 0, used: 0, unused: [] },
  } }))
  await page.route("**/api/me/profile", (route) => {
    saved = route.request().postDataJSON()
    return route.fulfill({ json: { updated: true, pendingReview: [] } })
  })
  await page.goto("/")
  await page.getByRole("link", { name: "注册", exact: true }).click()
  await expect(page).toHaveURL(/\/register$/)
  await page.getByRole("textbox", { name: "邮箱", exact: true }).fill("Person@Example.test")
  if (inviteRequired) await page.getByLabel("邀请码", { exact: true }).fill("TESTABCD")
  else await expect(page.getByLabel("邀请码", { exact: true })).toHaveCount(0)
  await page.getByRole("button", { name: "获取验证码" }).click()
  await expect(page.getByRole("status")).toContainText("验证码已发送")
  await expect(page.getByRole("button", { name: /秒后重发/ })).toBeDisabled()
  await page.getByRole("textbox", { name: "邮箱验证码", exact: true }).fill("135790")
  await page.getByLabel("密码", { exact: true }).fill("RegistrationTest123!")
  await page.getByLabel("确认密码", { exact: true }).fill("RegistrationTest123!")
  await page.screenshot({ path: testInfo.outputPath("email-register-375.png"), fullPage: true })
  await page.getByRole("button", { name: "注册", exact: true }).click()
  await expect(page).toHaveURL(/\/me$/)
  expect(registered).toEqual({ email: "person@example.test", verificationCode: "135790", password: "RegistrationTest123!", ...(inviteRequired ? { inviteCode: "TESTABCD" } : {}) })
  await expect(page.getByRole("heading", { name: "个人主页", exact: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "个人主页", exact: true })).toBeVisible()
  await page.getByRole("button", { name: /编辑个人资料/ }).click()
  await page.getByLabel("昵称", { exact: true }).fill("新的昵称")
  await page.getByRole("button", { name: "保存资料", exact: true }).click()
  await expect(page.getByText("资料已保存", { exact: true })).toBeVisible()
  expect(saved?.displayName).toBe("新的昵称")
  await expect(page.getByRole("link", { name: "账号与数据", exact: true }).first()).toHaveAttribute("href", "/settings/account")
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath("personal-page-375.png"), fullPage: true })
})
}

test("a failed email delivery is actionable and never claims a code was sent", async ({ page }) => {
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: { user: null } }))
  await page.route("**/api/config/register", (route) => route.fulfill({ json: { inviteRequired: false, emailDeliveryAvailable: true } }))
  await page.route("**/api/auth/register-code", (route) => route.fulfill({ status: 503, json: { error: "验证码发送失败，请稍后重试" } }))
  await page.goto("/register")
  await page.getByRole("textbox", { name: "邮箱", exact: true }).fill("person@example.test")
  await page.getByRole("button", { name: "获取验证码" }).click()
  await expect(page.locator("form").getByRole("alert")).toHaveText("验证码发送失败，请稍后重试")
  await expect(page.getByText("验证码已发送，请查看邮箱", { exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "获取验证码" })).toBeEnabled()
})

test("an unavailable mail provider is visible and does not accept registration", async ({ page }) => {
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: { user: null } }))
  await page.route("**/api/config/register", (route) => route.fulfill({ json: { inviteRequired: true, emailDeliveryAvailable: false } }))
  await page.goto("/register")
  await expect(page.getByText("邮箱验证暂不可用，请稍后再试。", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "获取验证码" })).toBeDisabled()
  await expect(page.getByRole("button", { name: "注册", exact: true })).toBeDisabled()
})
