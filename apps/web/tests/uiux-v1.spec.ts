import { expect, test } from "@playwright/test"

for (const width of [375, 390, 768, 1280, 1440]) {
  for (const [name, path, heading] of [
    ["home", "/", "找公司"],
    ["companies", "/companies", "公司"],
    ["detail", "/company/northstar-tech", "北辰智造科技"],
  ]) {
    test(`${name} V1 ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.goto(path)
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible()
      if (name !== "detail") {
        await expect(page.getByRole("link", { name: /查看北辰/ })).toBeVisible()
        await expect(page.getByRole("link", { name: "搜索公司", exact: true })).toHaveCount(0)
      } else {
        await expect(page.getByRole("navigation", { name: "公司信息导航" }).getByRole("link", { name: "概览" })).toHaveAttribute("aria-current", "page")
        await expect(page.getByText("★★★★☆")).toHaveCount(0)
        await expect(page.getByRole("button", { name: "关注公司" })).toHaveCount(0)
        await expect(page.getByRole("combobox", { name: "评价分类" })).toBeVisible()
        await page.getByRole("combobox", { name: "评价分类" }).selectOption("最新")
        await expect(page.getByRole("link", { name: "写评价", exact: true }).last()).toHaveAttribute("href", /companyId=northstar-tech/)
      }
      await expect(page.getByRole("button", { name: "通知", exact: true })).toHaveCount(0)
      await expect(page.getByRole("link", { name: "登录", exact: true })).toBeVisible()
      if (width < 1024) {
        await page.getByRole("button", { name: "打开菜单" }).click()
        await expect(page.getByRole("menu").getByRole("link", { name: "公司", exact: true })).toBeVisible()
        await page.keyboard.press("Escape")
        await expect(page.getByRole("menu")).toBeHidden()
      } else {
        await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible()
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`), fullPage: true })
      expect(errors).toEqual([])
    })
  }
}

test("directory retains filters, ten-point scores, clearing and keyboard navigation", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.route("**/api/companies/search**", (route) => route.fulfill({ json: { companies: [
    { id: "empty", name: "暂无样本公司", city: "杭州", industry: "科技", reviewCount: 0, directionScore: 9 },
    { id: "rated", name: "AnExtremelyLongCompanyNameWithoutAnySpacesForLayoutTesting", city: "北京", industry: "科技", reviewCount: 12, directionScore: 8, recommendationRate: 90 },
  ] } }))
  await page.goto("/companies")
  await expect(page.getByRole("link", { name: /查看暂无样本/ })).toContainText("暂无评分")
  const rated = page.getByRole("link", { name: /查看AnExtremely/ })
  await expect(rated).toContainText("8.0")
  await expect(rated).toContainText("/ 10")
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByLabel("排序", { exact: false }).selectOption("recommendation")
  await expect(page.getByTestId("company-directory-item").first()).toContainText("AnExtremely")
  await page.getByLabel("城市", { exact: false }).selectOption("杭州")
  await expect(rated).toHaveCount(0)
  await page.getByRole("textbox", { name: "搜索公司" }).fill("不存在")
  await page.getByRole("button", { name: "清除筛选" }).click()
  await expect(rated).toBeVisible()
  await rated.focus()
  await expect(rated).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/company\/rated$/)
})

test("failed catalog has a working retry, not fabricated companies", async ({ page }) => {
  let fail = true
  await page.route("**/api/companies/search**", (route) => route.fulfill(fail
    ? { status: 503, json: { error: "unavailable" } }
    : { json: { companies: [{ id: "recovered", name: "重试成功公司", city: "杭州", industry: "科技", reviewCount: 0 }] } }))
  await page.goto("/companies")
  await expect(page.getByRole("button", { name: "重试", exact: true })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId("company-directory-item")).toHaveCount(0)
  fail = false
  await page.getByRole("button", { name: "重试", exact: true }).click()
  await expect(page.getByRole("link", { name: /查看重试成功/ })).toBeVisible()
})

test("dark theme and reduced motion retain usable directory controls", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("sinan:theme", "dark"))
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/companies")
  await expect(page.locator("html")).toHaveClass(/dark/)
  const input = page.getByRole("textbox", { name: "搜索公司" })
  await input.fill("北辰")
  await expect(page.getByRole("link", { name: /查看北辰/ })).toBeVisible()
  await input.focus()
  await expect(input).toBeFocused()
  await page.screenshot({ path: testInfo.outputPath("directory-dark.png"), fullPage: true })
})
