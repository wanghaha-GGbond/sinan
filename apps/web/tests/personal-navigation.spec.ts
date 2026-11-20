import { expect, test } from "@playwright/test"

for (const width of [320, 390, 768, 1280]) for (const theme of ["light", "dark"]) {
  test(`my space preserves research and check-in access at ${width}px ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(theme => localStorage.setItem("sinan:theme", theme), theme)
    await page.route("**/api/auth/me", route => route.fulfill({ json: { user: null } }))
    await page.route("**/api/companies/search**", route => route.fulfill({ json: { companies: [] } }))
    const errors: string[] = []
    page.on("pageerror", error => errors.push(error.message))
    await page.goto("/me")
    const mainNav = page.getByRole("navigation", { name: width < 1024 ? "快捷导航" : "主导航" })
    await expect(mainNav.getByRole("link")).toHaveCount(4)
    await expect(mainNav.getByRole("link", { name: "我的", exact: true })).toHaveAttribute("aria-current", "page")
    await expect(mainNav.getByRole("link", { name: /研究|Pulse|打卡/ })).toHaveCount(0)
    const tools = page.getByRole("region", { name: "常用工具" })
    await expect(tools.getByRole("link", { name: /打卡与周报/ })).toBeVisible()
    await expect(tools.getByRole("link", { name: /公司研究/ })).toBeVisible()
    await expect(page.getByRole("link", { name: "登录 / 注册" })).toHaveAttribute("href", "/login?next=%2Fme")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath("my-space.png"), fullPage: true })
    await tools.getByRole("link", { name: /打卡与周报/ }).click()
    await expect(page).toHaveURL(/\/pulse$/)
    await expect(page.getByRole("heading", { name: "打卡与周报", exact: true })).toBeVisible()
    const personalNav = page.getByRole("navigation", { name: "我的工具" })
    await expect(personalNav.getByRole("link", { name: "打卡与周报", exact: true })).toHaveAttribute("aria-current", "page")
    await expect(mainNav.getByRole("link", { name: "我的", exact: true })).toHaveAttribute("aria-current", "page")
    await expect(page.getByRole("link", { name: "登录后记录今天" })).toHaveAttribute("href", "/login?next=%2Fpulse")
    await personalNav.getByRole("link", { name: "公司研究", exact: true }).click()
    await expect(page).toHaveURL(/\/research$/)
    await expect(page.getByRole("heading", { name: "公司研究", exact: true })).toBeVisible()
    await expect(personalNav.getByRole("link", { name: "公司研究", exact: true })).toHaveAttribute("aria-current", "page")
    await expect(page.locator('a[href="/research/bytedance"]')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath("research-in-my-space.png"), fullPage: true })
    await personalNav.getByRole("link", { name: "概览", exact: true }).click()
    await expect(page).toHaveURL(/\/me$/)
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
  await page.getByRole("navigation", { name: "我的工具" }).getByRole("link", { name: "公司研究" }).click()
  await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  expect(await page.evaluate(() => localStorage.getItem("sinan:theme"))).toBe("dark")
  await page.reload()
  await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  await page.getByTestId("theme-toggle").click()
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/)
})

test("signed-in overview keeps personal tools alongside reviews and profile", async ({ page }) => {
  const user = { id: "personal-ui", displayName: "测试用户", role: "user", trustLevel: 0 }
  await page.route("**/api/auth/me", route => route.fulfill({ json: { user } }))
  await page.route("**/api/me", route => route.fulfill({ json: {
    user, stats: { directionPoints: 0, nextLevelPoints: 100, streakDays: 0, helpedCount: 0 },
    dailyTasks: [], badges: [], myReviews: [], favoriteCompanies: [], verifications: [], invites: { total: 0, used: 0, unused: [] },
  } }))
  await page.goto("/me")
  await expect(page.getByRole("heading", { name: "个人主页", exact: true })).toBeVisible()
  await expect(page.getByRole("region", { name: "常用工具" }).getByRole("link")).toHaveCount(2)
  await expect(page.getByRole("button", { name: /编辑个人资料/ })).toBeVisible()
  await expect(page.getByRole("navigation", { name: "我的社区" }).getByRole("link", { name: "我的帖子" })).toHaveAttribute("href", "/community?feed=mine")
  await expect(page.getByRole("heading", { name: "我的评价", exact: true }).first()).toBeVisible()
})
