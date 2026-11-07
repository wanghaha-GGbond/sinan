import { expect, test, type Page } from "@playwright/test"

const id = "northstar-tech"
const company = { id, name: "北辰智造科技", city: "上海", industry: "软件", reviewCount: 20, directionScore: 8, createdAt: "2026-01-01" }
async function fixtures(page: Page, trustLevel?: number) {
  await page.route("**/api/auth/me", route => route.fulfill({ json: { user: trustLevel === undefined ? null : { id: "ux-fixture", role: "user", trustLevel } } }))
  await page.route("**/api/promise-records?**", route => route.fulfill({ json: { records: [] } }))
  await page.route("**/api/companies/search**", route => {
    const q = new URL(route.request().url()).searchParams.get("q") ?? ""
    return route.fulfill({ json: { companies: !q || company.name.includes(q) ? [company] : [] } })
  })
}

for (const theme of ["light", "dark"]) for (const width of [390, 1280]) {
  test(`company sections retain identity and reachable navigation ${theme} ${width}`, async ({ page }, testInfo) => {
    await fixtures(page)
    await page.setViewportSize({ width, height: 844 })
    await page.addInitScript(theme => localStorage.setItem("sinan:theme", theme), theme)
    await page.goto(`/company/${id}`)
    for (const section of ["概览", "评价", "评分", "承诺"] as const) {
      const nav = page.getByRole("navigation", { name: "公司信息导航" })
      await nav.getByRole("link", { name: section, exact: true }).click()
      await expect(nav.getByRole("link", { name: section, exact: true })).toHaveAttribute("aria-current", "page")
      await expect(page.getByTestId("company-page-header")).toContainText(company.name)
      await expect(page.locator("h1")).toHaveCount(1)
      if (theme === "dark") await expect(page.locator("html")).toHaveClass(/\bdark\b/)
      else await expect(page.locator("html")).not.toHaveClass(/\bdark\b/)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`${section}-${theme}-${width}.png`), fullPage: true })
    }
    await expect(page.getByRole("heading", { name: "暂无公开承诺记录" })).toBeVisible()
    await expect(page.getByRole("textbox", { name: "当时的承诺" })).toHaveCount(0)
    await page.getByRole("link", { name: "登录后继续" }).click()
    await expect(page).toHaveURL(url => url.pathname === "/login" && url.searchParams.get("next") === `/company/${id}/promises`)
  })
}

test("directory filters survive reload and a company round-trip, reset clears all controls", async ({ page }) => {
  await fixtures(page)
  await page.goto("/companies")
  await page.getByLabel("搜索公司", { exact: true }).fill("北辰")
  await page.getByLabel("城市", { exact: false }).selectOption("上海")
  await page.getByLabel("排序", { exact: false }).selectOption("score")
  await page.getByRole("checkbox", { name: "只看有评价" }).check()
  const expectedUrl = page.url()
  expect(new URL(expectedUrl).searchParams.get("q")).toBe("北辰")
  await page.reload()
  await expect(page.getByLabel("搜索公司", { exact: true })).toHaveValue("北辰")
  await expect(page.getByLabel("城市", { exact: false })).toHaveValue("上海")
  await expect(page.getByLabel("排序", { exact: false })).toHaveValue("score")
  await expect(page.getByRole("checkbox", { name: "只看有评价" })).toBeChecked()
  await page.getByTestId("company-directory-item").click()
  await expect(page).toHaveURL(new RegExp(`/company/${id}$`))
  await page.goBack()
  await expect(page).toHaveURL(expectedUrl)
  await expect(page.getByLabel("搜索公司", { exact: true })).toHaveValue("北辰")
  await page.getByRole("button", { name: "清除筛选" }).click()
  await expect(page).toHaveURL(/\/companies$/)
  await expect(page.getByLabel("排序", { exact: false })).toHaveValue("reviews")
  await expect(page.getByRole("checkbox", { name: "只看有评价" })).not.toBeChecked()
})

test("search keeps focus and URL, survives reload and can retry a failed API", async ({ page }) => {
  await fixtures(page)
  await page.goto("/search?q=其他")
  const field = page.getByRole("textbox", { name: "公司名称", exact: true })
  await field.fill("北辰")
  await expect(field).toBeFocused()
  await expect(page).toHaveURL(url => url.searchParams.get("q") === "北辰")
  await expect(page.getByTestId("company-directory-item")).toBeVisible()
  await page.reload()
  await expect(field).toHaveValue("北辰")
  let fail = true
  // Match encoded query as well; never contact a live backend in this fixture.
  await page.route("**/api/companies/search?*", route => {
    const q = new URL(route.request().url()).searchParams.get("q")
    if (q !== "失败") return route.fallback()
    return route.fulfill(fail ? { status: 503, json: { error: "offline" } } : { json: { companies: [company] } })
  })
  await field.fill("失败")
  await expect(page.getByRole("main").getByRole("alert")).toContainText("搜索暂时不可用", { timeout: 15_000 })
  await expect(page.getByText("没有找到这家公司")).toHaveCount(0)
  fail = false
  await page.getByRole("button", { name: "重试", exact: true }).click()
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0)
  await expect(page.getByTestId("company-directory-item")).toBeVisible()
})

test("promise load failure is not an empty success and can recover", async ({ page }) => {
  await fixtures(page)
  let fail = true
  await page.route("**/api/promise-records?**", route => route.fulfill(fail ? { status: 503, json: { error: "offline" } } : { json: { records: [] } }))
  await page.goto(`/company/${id}/promises`)
  await expect(page.getByRole("main").getByRole("alert")).toContainText("承诺记录暂时无法加载")
  await expect(page.getByRole("heading", { name: "暂无公开承诺记录" })).toHaveCount(0)
  fail = false
  await page.getByRole("button", { name: "重试承诺记录" }).click()
  await expect(page.getByRole("heading", { name: "暂无公开承诺记录" })).toBeVisible()
})

test("unverified employees get a company-specific verification action before filling a promise", async ({ page }) => {
  await fixtures(page, 1)
  await page.goto(`/company/${id}/promises`)
  await expect(page.getByRole("heading", { name: "先完成任职证明" })).toBeVisible()
  await expect(page.locator("form")).toHaveCount(0)
  await expect(page.getByRole("link", { name: "去验证任职信息" })).toHaveAttribute("href", `/company-verification?companyId=${id}&companyName=${encodeURIComponent(company.name)}`)
})

for (const width of [390, 1280]) test(`long public promise text wraps without hiding outcomes at ${width}px`, async ({ page }) => {
  await fixtures(page)
  await page.setViewportSize({ width, height: 844 })
  await page.route("**/api/promise-records?**", route => route.fulfill({ json: { records: [{
    id: "public-fixture", promiseCategory: "工作地点", promiseDate: "2026-11-01",
    promiseText: "LongWord".repeat(20), outcomeText: "LongResult".repeat(16), outcomeStatus: "partial",
  }] } }))
  await page.goto(`/company/${id}/promises`)
  await expect(page.getByText("部分兑现", { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test("promise submission has no fabricated outcome, preserves inputs on failure and confirms pending review", async ({ page }) => {
  await fixtures(page, 2)
  let fail = true
  let payload: Record<string, unknown> | undefined
  await page.route("**/api/promise-records", route => {
    payload = route.request().postDataJSON()
    return route.fulfill(fail ? { status: 503, json: { error: "提交暂时不可用" } } : { status: 201, json: { record: { id: "fixture-promise", status: "pending_review" } } })
  })
  await page.goto(`/company/${id}/promises`)
  await expect(page.getByRole("combobox", { name: "实际结果", exact: true })).toHaveValue("")
  await page.getByLabel("承诺日期").fill("2026-11-01")
  await page.getByLabel("当时的承诺").fill("书面约定了工作地点")
  await page.getByRole("combobox", { name: "实际结果", exact: true }).selectOption("kept")
  await page.getByLabel("实际发生", { exact: true }).fill("工作地点与约定一致")
  await page.getByLabel("证据摘要").fill("Offer 第三条")
  await page.getByRole("button", { name: "提交人工审核" }).click()
  await expect(page.locator("form").getByRole("alert")).toContainText("提交暂时不可用")
  await expect(page.getByLabel("当时的承诺")).toHaveValue("书面约定了工作地点")
  expect(payload).toMatchObject({ companyId: id, outcomeStatus: "kept" })
  fail = false
  await page.getByRole("button", { name: "提交人工审核" }).click()
  await expect(page.getByRole("heading", { name: "已提交，等待审核" })).toBeVisible()
  await expect(page.getByRole("button", { name: "提交人工审核" })).toHaveCount(0)
})
