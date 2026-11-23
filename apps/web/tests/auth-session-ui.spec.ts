import { expect, test, type Page } from "@playwright/test"

const user = { id: "auth-session-fixture", displayName: "登录验收用户", role: "user", trustLevel: 0 }
async function dashboard(page: Page, reviewCount = 0) {
  await page.route("**/api/me", route => route.fulfill({ json: {
    user, stats: { directionPoints: 0, nextLevelPoints: 100, streakDays: 0, helpedCount: 0 },
    dailyTasks: [], badges: [], myReviews: Array.from({ length: reviewCount }, (_, index) => ({ id: `own-review-${index}`, companyId: "fixture-company", companyName: "隔离公司", title: "我的真实评价", score: 8, shortComment: "隔离测试", helpful: 0, commentCount: 0, createdAt: "2026-11-23T00:00:00Z" })), favoriteCompanies: [], verifications: [], invites: { total: 0, used: 0, unused: [] },
  } }))
}

for (const failure of ["http", "network", "unconfirmed"]) test(`failed logout keeps the session and supports retry: ${failure}`, async ({ page }) => {
  let signedIn = true, fail = true
  await page.route("**/api/auth/me", route => route.fulfill({ json: { user: signedIn ? user : null } }))
  await dashboard(page)
  await page.route("**/api/auth/logout", route => {
    if (fail) return failure === "network" ? route.abort() : route.fulfill({ status: failure === "http" ? 503 : 200, json: { success: false } })
    signedIn = false
    return route.fulfill({ json: { success: true } })
  })
  await page.goto("/me")
  const logout = page.getByRole("button", { name: "退出登录", exact: true })
  await logout.click()
  await expect(page.getByText("未能确认退出，请重试", { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/me$/)
  await expect(page.getByRole("heading", { name: "个人主页", exact: true })).toBeVisible()
  await expect(logout).toBeEnabled()
  await page.reload()
  await expect(logout).toBeVisible()
  fail = false
  await logout.click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto("/me")
  await expect(page.getByRole("link", { name: "登录 / 注册", exact: true })).toBeVisible()
})

test("a late anonymous auth refresh cannot undo a successful login", async ({ page }) => {
  let complete!: () => void
  const waiting = new Promise<void>(resolve => { complete = resolve })
  let started!: () => void
  const initialRefreshStarted = new Promise<void>(resolve => { started = resolve })
  let first = true
  await page.route("**/api/auth/me", async route => {
    if (first) { first = false; started(); await waiting; return route.fulfill({ json: { user: null } }) }
    return route.fulfill({ json: { user } })
  })
  await page.route("**/api/auth/login", route => route.fulfill({ json: { user } }))
  await dashboard(page)
  try {
    await page.goto("/login?next=%2Fme", { waitUntil: "domcontentloaded" })
    await initialRefreshStarted
    await page.getByLabel("邮箱", { exact: true }).fill("fixture@example.test")
    await page.getByLabel("密码", { exact: true }).fill("IsolatedFixture123!")
    await page.getByRole("button", { name: "登录", exact: true }).click()
    await expect(page.getByRole("heading", { name: "个人主页", exact: true })).toBeVisible()
    const staleResponse = page.waitForResponse(response => response.url().endsWith("/api/auth/me"))
    complete()
    await staleResponse
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await expect(page.getByRole("button", { name: "退出登录", exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "登录 / 注册", exact: true })).toHaveCount(0)
  } finally { complete() }
})

for (const count of [0, 1]) test(`personal page never invents gamification for ${count} existing reviews`, async ({ page }) => {
  await page.route("**/api/auth/me", route => route.fulfill({ json: { user } }))
  await dashboard(page, count)
  await page.goto("/me")
  await expect(page.getByRole("heading", { name: "个人主页", exact: true })).toBeVisible()
  for (const text of ["今日指路任务", "连续点灯", "方向值", "在场徽章", "奖励 +"]) await expect(page.getByRole("main")).not.toContainText(text)
  await expect(page.getByRole("link", { name: "积分与任务", exact: true })).toHaveAttribute("href", "/me/points")
})

for (const action of ["login", "register"] as const) test(`a failed ${action} does not discard an existing valid session lookup`, async ({ page }) => {
  let release!: () => void, started!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  const initialRefreshStarted = new Promise<void>(resolve => { started = resolve })
  await page.route("**/api/auth/me", async route => { started(); await pending; return route.fulfill({ json: { user } }) })
  await page.route(`**/api/auth/${action}`, route => route.fulfill({ status: 400, json: { error: "隔离测试：提交失败" } }))
  await page.route("**/api/config/register", route => route.fulfill({ json: { inviteRequired: false, emailDeliveryAvailable: true } }))
  await dashboard(page)
  try {
    await page.goto(`/${action}?next=%2Fme`, { waitUntil: "domcontentloaded" })
    await initialRefreshStarted
    await page.getByLabel("邮箱", { exact: true }).fill("fixture@example.test")
    await page.getByLabel("密码", { exact: true }).fill("IsolatedFixture123!")
    if (action === "register") {
      await page.getByLabel("确认密码", { exact: true }).fill("IsolatedFixture123!")
      await page.getByLabel("邮箱验证码", { exact: true }).fill("135790")
    }
    await page.getByRole("button", { name: action === "login" ? "登录" : "注册", exact: true }).click()
    await expect(page.getByText("隔离测试：提交失败", { exact: true })).toBeVisible()
    release()
    await expect(page.getByRole("heading", { name: "个人主页", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "退出登录", exact: true })).toBeVisible()
  } finally { release() }
})
