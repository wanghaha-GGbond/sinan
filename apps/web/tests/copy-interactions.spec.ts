import { expect, test } from "@playwright/test"

test("home search submits the keyword without explanatory banners", async ({ page }, testInfo) => {
  await page.route("**/api/**", (route) => route.fulfill({ json: { user: null } }))
  const keywords: string[] = []
  await page.route("**/api/companies/search**", (route) => {
    keywords.push(new URL(route.request().url()).searchParams.get("q") ?? "")
    return route.fulfill({ json: { companies: [{
      id: "sample", name: "测试科技", shortName: "测试科技", city: "杭州",
      industry: "互联网", directionScore: 8, recommendationRate: 80, reviewCount: 10,
    }] } })
  })
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "测试科技" })).toBeVisible()
  await expect(page.getByText("职场决策工具", { exact: false })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "隐私政策" })).toBeVisible()
  await expect(page.getByRole("link", { name: "公司研究", exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true })
  await page.getByRole("search").getByLabel("公司名称").fill("测试科技")
  await page.getByRole("search").getByRole("button", { name: "搜索", exact: true }).click()
  await expect(page).toHaveURL(/\/search\?q=/)
  await expect(page.getByLabel("公司名称", { exact: true })).toHaveValue("测试科技")
  await expect.poll(() => keywords.includes("测试科技")).toBe(true)
  await expect(page.getByRole("heading", { name: "测试科技" })).toBeVisible()
  await expect(page.getByText("先找到你真正想了解的公司。", { exact: true })).toHaveCount(0)
})

test("research lists come first while methodology remains expandable", async ({ page }, testInfo) => {
  await page.route("**/api/**", (route) => route.fulfill({ json: { user: null } }))
  await page.goto("/research")
  await expect(page.getByRole("heading", { name: "公司研究", exact: true })).toBeVisible()
  await expect(page.locator('a[href^="/research/"]').first()).toBeVisible()
  const details = page.locator("details")
  await expect(details).not.toHaveAttribute("open", "")
  await page.screenshot({ path: testInfo.outputPath("research.png"), fullPage: true })
  await details.locator("summary").focus()
  await page.keyboard.press("Enter")
  await expect(details).toHaveAttribute("open", "")
  await expect(details.getByText(/不代表每个部门、城市或岗位的实际体验/)).toBeVisible()
})

test("register keeps its privacy notice and Pulse keeps its example-data label", async ({ page }) => {
  await page.route("**/api/**", (route) => route.fulfill({ json: { user: null, inviteRequired: true } }))
  await page.goto("/register")
  await expect(page.getByRole("heading", { name: "注册在场" })).toBeVisible()
  await expect(page.getByLabel("邀请码", { exact: false })).toBeVisible()
  await expect(page.getByText(/你的身份信息不会向公司方公开/)).toBeVisible()
  await expect(page.getByText("成为指路人，分享真实体验")).toHaveCount(0)
  await page.goto("/pulse")
  await expect(page.getByText("体验版 · 周报与公司趋势为示例数据", { exact: true })).toBeVisible()
})
