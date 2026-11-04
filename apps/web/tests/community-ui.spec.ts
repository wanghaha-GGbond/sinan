import { expect, test } from "@playwright/test"

const discussions = [
  { id: "discussion-1", reviewId: "review-1", companyId: "company-1", companyName: "社区测试公司", industry: "科技", city: "上海", type: "question", authorLabel: "匿名同事", content: "团队现在的加班情况如何？", usefulCount: 3, tags: ["工作节奏"], createdAt: "2026-10-31T00:00:00Z" },
  { id: "discussion-2", reviewId: "review-1", companyId: "company-1", companyName: "社区测试公司", industry: "科技", city: "上海", type: "supplement", authorLabel: "前同事", content: "补充一下研发团队的实际情况。", usefulCount: 1, tags: null, createdAt: "2026-10-31T00:00:00Z" },
]

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: { user: null } }))
})

for (const width of [375, 1280]) {
  test(`PR6 layout with live API contract ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const requested: URL[] = []
    await page.route("**/api/community**", (route) => {
      const url = new URL(route.request().url())
      requested.push(url)
      const type = url.searchParams.get("type")
      return route.fulfill({ json: { discussions: discussions.filter((item) => !type || item.type === type), limit: 50 } })
    })
    await page.goto("/community")
    await expect(page.getByRole("heading", { name: "社区", exact: true })).toBeVisible()
    await expect(page.getByText("以下为产品演示讨论，非实时用户发言")).toHaveCount(0)
    await expect(page.locator("article").first()).toBeVisible()
    await page.getByRole("button", { name: "追问", exact: true }).click()
    await expect(page.getByRole("button", { name: "追问", exact: true })).toHaveAttribute("aria-pressed", "true")
    await expect(page.locator("article")).toHaveCount(1)
    for (const article of await page.locator("article").all()) await expect(article).toContainText("追问")
    await page.getByRole("button", { name: "全部", exact: true }).click()
    await page.getByRole("combobox", { name: "排序", exact: true }).selectOption("company")
    await expect(page.getByRole("combobox", { name: "排序", exact: true })).toHaveValue("company")
    await expect.poll(() => requested.some((url) => url.searchParams.get("sort") === "company")).toBe(true)
    await expect(page.getByRole("link", { name: "查看评价与讨论" }).first()).toHaveAttribute("href", "/company/company-1/reviews/review-1")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole("link", { name: "注册", exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`community-${width}.png`), fullPage: true })
  })
}

test("community reports API failure and can retry without fabricating content", async ({ page }) => {
  let healthy = false
  await page.route("**/api/community**", (route) => healthy
    ? route.fulfill({ json: { discussions: [], limit: 50 } })
    : route.fulfill({ status: 503, json: { error: "Unavailable" } }))
  await page.goto("/community")
  await expect(page.getByText("讨论暂时无法加载", { exact: true })).toBeVisible()
  await expect(page.locator("article")).toHaveCount(0)
  healthy = true
  await page.getByRole("button", { name: "重试", exact: true }).click()
  await expect(page.getByText("没有匹配的社区讨论", { exact: true })).toBeVisible()
})
