import { expect, test, type Page } from "@playwright/test"

const company = (id: string, name: string) => ({
  id, name, shortName: name, industry: "互联网", city: "杭州",
  directionScore: 8, recommendationRate: 90, reviewCount: 12,
})
const catalog = [company("a", "测试公司甲"), company("b", "测试公司乙")]

async function isolateApis(page: Page) {
  await page.route("**/api/**", (route) => route.fulfill({ json: { user: null } }))
}

test("homepage, directory, and search reuse one catalog request on client navigation", async ({ page, isMobile }) => {
  await isolateApis(page)
  let catalogRequests = 0
  await page.route("**/api/companies/search**", (route) => {
    catalogRequests++
    return route.fulfill({ json: { companies: catalog } })
  })
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "测试公司甲" })).toBeVisible()

  if (isMobile) await page.getByRole("button", { name: "打开菜单" }).click()
  await page.getByRole("link", { name: "公司", exact: true }).filter({ visible: true }).click()
  await expect(page.getByTestId("company-directory")).toBeVisible()
  await expect(page.getByRole("heading", { name: "测试公司甲" })).toBeVisible()
  expect(catalogRequests).toBe(1)

  await page.getByRole("link", { name: "返回在场首页" }).click()
  await page.locator("main").getByRole("link", { name: "搜索公司", exact: true }).first().click()
  await expect(page.getByRole("button", { name: "测试公司甲", exact: true })).toBeVisible()
  // An empty search must not show the entire catalog as search results.
  await expect(page.getByRole("heading", { name: "测试公司甲" })).toHaveCount(0)
  expect(catalogRequests).toBe(1)
})

test("slow searches keep previous cards visible and clearing removes the results", async ({ page }) => {
  await isolateApis(page)
  let finishSecond!: () => void
  const secondGate = new Promise<void>((resolve) => { finishSecond = resolve })
  await page.route("**/api/companies/search**", async (route) => {
    const q = new URL(route.request().url()).searchParams.get("q")
    if (q === "第二次") await secondGate
    await route.fulfill({ json: { companies: q === "第二次" ? [catalog[1]] : [catalog[0]] } })
  })
  try {
    await page.goto("/search")
    const input = page.getByPlaceholder("搜索公司、职位或话题")
    await input.fill("第一次")
    await input.press("Enter")
    await expect(page.getByRole("heading", { name: "测试公司甲" })).toBeVisible()
    await expect(page.getByRole("status")).toHaveCount(0)

    await input.fill("第二次")
    await input.press("Enter")
    await expect(page.getByRole("status")).toContainText("正在更新搜索结果")
    await expect(page.getByRole("heading", { name: "测试公司甲" })).toBeVisible()
    await expect(page.getByText("没有找到这家公司", { exact: true })).toHaveCount(0)
    finishSecond()
    await expect(page.getByRole("heading", { name: "测试公司乙" })).toBeVisible()

    await input.fill("")
    await input.press("Enter")
    await expect(page.getByRole("heading", { name: "测试公司乙" })).toHaveCount(0)
    await expect(page.getByRole("status")).toHaveCount(0)
  } finally {
    finishSecond()
  }
})
