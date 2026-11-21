import { expect, test } from "@playwright/test"

for (const width of [320, 390, 768, 1280]) for (const theme of ["light", "dark"]) {
  test(`three destinations and legacy personal links at ${width}px ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(theme => localStorage.setItem("sinan:theme", theme), theme)
    await page.route("**/api/auth/me", route => route.fulfill({ json: { user: null } }))
    const errors: string[] = []
    page.on("pageerror", error => errors.push(error.message))
    await page.goto("/me")
    const nav = page.getByRole("navigation", { name: width < 1024 ? "快捷导航" : "主导航" })
    await expect(nav.getByRole("link")).toHaveCount(3)
    await expect(nav.getByRole("link", { name: "我的", exact: true })).toHaveAttribute("aria-current", "page")
    await expect(nav.getByRole("link", { name: /研究|Pulse|打卡|评分/ })).toHaveCount(0)
    await expect(page.locator('a[href^="/research"]')).toHaveCount(0)
    await expect(page.getByRole("navigation", { name: "我的工具" })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "登录 / 注册" })).toHaveAttribute("href", "/login?next=%2Fme")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath("my-space.png"), fullPage: true })
    await page.goto("/pulse")
    await expect(page).toHaveURL(/\/me#work-records$/)
    await expect(page.getByRole("link", { name: "登录后记录今天" })).toHaveAttribute("href", "/login?next=%2Fme%23work-records")
    expect(errors).toEqual([])
  })
}

test("global theme control persists through navigation and reload", async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem("sinan:theme")) localStorage.setItem("sinan:theme", "light") })
  await page.route("**/api/auth/me", route => route.fulfill({ json: { user: null } }))
  await page.goto("/me")
  await page.getByTestId("theme-toggle").click()
  await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  await expect(page.getByTestId("theme-toggle")).toHaveAttribute("aria-label", "切换到浅色模式")
  await page.goto("/community")
  await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  expect(await page.evaluate(() => localStorage.getItem("sinan:theme"))).toBe("dark")
  await page.reload()
  await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  await page.getByTestId("theme-toggle").click()
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/)
})

test("signed-in overview opens work records inline only on request", async ({ page }) => {
  const user = { id: "personal-ui", displayName: "测试用户", role: "user", trustLevel: 0 }
  await page.route("**/api/auth/me", route => route.fulfill({ json: { user } }))
  await page.route("**/api/me", route => route.fulfill({ json: {
    user, stats: { directionPoints: 0, nextLevelPoints: 100, streakDays: 0, helpedCount: 0 },
    dailyTasks: [], badges: [], myReviews: [], favoriteCompanies: [], verifications: [], invites: { total: 0, used: 0, unused: [] },
  } }))
  let recordRequests = 0
  await page.route("**/api/me/pulse", route => {
    recordRequests++
    return route.fulfill({ json: { today: "2026-11-21", records: [], summary: { days: 0, score: null, workMinutes: null } } })
  })
  await page.goto("/me")
  await expect(page.getByRole("heading", { name: "个人主页", exact: true })).toBeVisible()
  const records = page.getByRole("button", { name: /工作记录/ })
  await expect(records).toHaveAttribute("aria-expanded", "false")
  expect(recordRequests).toBe(0)
  await records.click()
  await expect(records).toHaveAttribute("aria-expanded", "true")
  await expect(page.getByRole("button", { name: "保存今天" })).toBeVisible()
  await expect(page).toHaveURL(/\/me$/)
  expect(recordRequests).toBe(1)
  await records.click()
  await expect(page.getByRole("button", { name: "保存今天" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: /编辑个人资料/ })).toBeVisible()
  await expect(page.getByRole("navigation", { name: "我的社区" }).getByRole("link", { name: "我的帖子" })).toHaveAttribute("href", "/community?feed=mine")
  await expect(page.getByRole("heading", { name: "我的评价", exact: true }).first()).toBeVisible()
})
