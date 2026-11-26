import { expect, test, type Page } from "@playwright/test"

const user = { id: "auth-session-fixture", displayName: "登录验收用户", role: "user", trustLevel: 0 }
async function dashboard(page: Page, reviewCount = 0, nextCursor: string | null = null) {
  await page.route("**/api/me", route => route.fulfill({ json: {
    user, myReviewsNextCursor: nextCursor, stats: { directionPoints: 0, nextLevelPoints: 100, streakDays: 0, helpedCount: 0 },
    dailyTasks: [], badges: [], myReviews: Array.from({ length: reviewCount }, (_, index) => ({ id: `own-review-${index}`, companyId: "fixture-company", companyName: "隔离公司", title: "我的真实评价", score: 8, shortComment: "隔离测试", helpful: 0, commentCount: 0, createdAt: "2026-11-23T00:00:00Z" })), favoriteCompanies: [], verifications: [], invites: { total: 0, used: 0, unused: [] },
  } }))
}

for (const [path, heading] of [["/submit/review", "写评价"], ["/settings/account", "账号与数据"]]) {
  test(`session lookup failures keep the original page and retry: ${path}`, async ({ page }) => {
    let attempts = 0
    await page.route("**/api/auth/me", route => {
      attempts++
      if (attempts === 1) return route.abort()
      if (attempts === 2) return route.fulfill({ status: 503, json: { error: "unavailable" } })
      return route.fulfill({ json: { user } })
    })
    await page.goto(path)
    for (let i = 0; i < 2; i++) {
      await expect(page.getByText("暂时无法确认登录状态", { exact: true })).toBeVisible()
      expect(new URL(page.url()).pathname).toBe(path)
      await page.getByRole("button", { name: "重试", exact: true }).click()
    }
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible()
    expect(new URL(page.url()).pathname).toBe(path)
  })
}

test("only a confirmed account deletion clears mobile navigation without reloading", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route("**/api/auth/me", route => route.fulfill({ json: { user } }))
  let confirmed = false
  await page.route("**/api/me/account", route => route.fulfill({ json: { success: confirmed } }))
  await page.goto("/settings/account")
  await page.locator("#delete-confirmation").fill("DELETE")
  const submit = page.getByRole("button", { name: "永久注销账号" })
  await submit.click()
  await expect(page.getByRole("alert").filter({ hasText: "未能确认注销结果" })).toBeVisible()
  await expect(page.getByRole("banner").getByRole("link", { name: "个人主页" })).toBeVisible()
  confirmed = true
  await submit.click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole("banner").getByRole("link", { name: "登录", exact: true })).toBeVisible()
  await expect(page.getByRole("banner").getByRole("link", { name: "个人主页" })).toHaveCount(0)
})

test("older personal reviews are appended once, and a failed page can be retried", async ({ page }) => {
  await page.route("**/api/auth/me", route => route.fulfill({ json: { user } }))
  await dashboard(page, 1, "fixture-cursor")
  let attempts = 0
  const row = { id: "older-review", companyId: "fixture-company", companyName: "早期公司", title: "早期记录", score: 7, shortComment: "历史", helpful: 0, commentCount: 0, createdAt: "2025-01-01T00:00:00Z" }
  await page.route("**/api/me/reviews?cursor=fixture-cursor", route => ++attempts === 1
    ? route.fulfill({ status: 503, json: { error: "unavailable" } })
    : route.fulfill({ json: { reviews: [row, { ...row, id: "own-review-0" }], nextCursor: null } }))
  await page.goto("/me")
  await page.getByRole("button", { name: "加载更早评价" }).click()
  await expect(page.getByRole("alert").filter({ hasText: "更早的评价暂时无法加载" })).toBeVisible()
  const list = page.getByTestId("me-my-reviews")
  const first = list.getByText("隔离公司", { exact: true })
  await expect(first).toHaveCount(1)
  await page.getByRole("button", { name: "重试加载更早评价" }).click()
  await expect(list.getByText("早期公司", { exact: true })).toHaveCount(1)
  await expect(first).toHaveCount(1)
  await expect(page.getByRole("button", { name: /加载更早评价/ })).toHaveCount(0)
})

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
