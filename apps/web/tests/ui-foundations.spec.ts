import { expect, test } from "@playwright/test"

const widths = [1440, 1280, 768, 390, 375]
const pages = [
  { path: "/", heading: "找公司", name: "home" },
  { path: "/companies", heading: "公司", name: "companies" },
  { path: "/company/northstar-tech", heading: "北辰智造科技", name: "detail" },
]

for (const width of widths) {
  for (const entry of pages) {
    test(`${entry.name} fits ${width}px`, async ({ page }, testInfo) => {
      test.setTimeout(60_000)
      await page.setViewportSize({ width, height: 900 })
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text())
      })
      await page.goto(entry.path)
      await expect(page.getByRole("heading", { name: entry.heading, exact: true }).first()).toBeVisible()
      if (entry.name !== "detail") {
        await expect(page.getByRole("link", { name: /查看北辰/ })).toBeVisible()
        if (entry.name === "home" && width >= 1200) {
          await expect(page.getByRole("complementary", { name: "新收录公司" }).getByRole("link", { name: /大疆创新/ })).toBeVisible()
        }
      } else {
        await expect(page.getByRole("navigation", { name: "公司信息导航" }).getByRole("link", { name: "概览" })).toHaveAttribute("aria-current", "page")
        await expect(page.getByText("★★★★☆")).toHaveCount(0)
        await expect(page.getByRole("complementary", { name: "公司证据摘要" })).toBeVisible()
        await expect(page.getByText("本地演示数据 · 非真实公司评价")).toBeVisible()
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)")
      if (width < 1200) {
        await page.getByRole("button", { name: "打开菜单" }).click()
        await expect(page.getByRole("menu").getByRole("link", { name: "写评价" })).toBeVisible()
        await page.keyboard.press("Escape")
        await expect(page.getByRole("menu")).toBeHidden()
      } else {
        await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible()
      }
      await page.screenshot({ path: testInfo.outputPath(`${entry.name}-${width}.jpg`), fullPage: true, quality: 80 })
      expect(errors).toEqual([])
    })
  }
}

test("directory filters and handles missing scores without inventing stars", async ({ page }) => {
  await page.route("**/api/companies/search**", (route) => route.fulfill({ json: { companies: [
    { id: "empty", name: "暂无样本科技", city: "杭州", industry: "科技", reviewCount: 0, directionScore: 0 },
    { id: "rated", name: "已评价科技", city: "北京", industry: "科技", reviewCount: 10, directionScore: 8 },
  ] } }))
  await page.goto("/companies")
  const empty = page.getByRole("link", { name: /查看暂无样本科技/ })
  await expect(empty).toContainText("暂无评分")
  await expect(empty.locator("svg.lucide-star")).toHaveCount(0)
  await expect(page.getByRole("link", { name: /查看已评价科技/ })).toContainText("4.0")
  await page.getByLabel("城市", { exact: false }).selectOption("杭州")
  await expect(page.getByRole("link", { name: /查看已评价科技/ })).toHaveCount(0)
  await page.getByRole("textbox", { name: "搜索公司", exact: true }).fill("不存在")
  await expect(page.getByText("没有匹配的公司")).toBeVisible()
  await page.getByRole("textbox", { name: "搜索公司", exact: true }).fill("")
  await page.getByLabel("城市", { exact: false }).selectOption("全部")
  await page.getByLabel("排序", { exact: false }).selectOption("score")
  await expect(page.locator('[data-testid="company-directory"] a').first()).toContainText("已评价科技")
})

test("recommendation timeline switches order and opens a company", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")
  const feed = page.getByTestId("home-recommend-feed")
  await expect(feed.getByTestId("company-feed-item")).toHaveCount(12)
  await expect(feed.getByTestId("company-feed-item").first()).toContainText("北辰智造")
  await feed.getByRole("tab", { name: "最新" }).click()
  await expect(feed.getByRole("tab", { name: "最新" })).toHaveAttribute("aria-selected", "true")
  await expect(feed.getByTestId("company-feed-item").first()).toContainText("联想")
  await feed.getByRole("tab", { name: "推荐" }).click()
  await feed.getByRole("link", { name: /查看北辰/ }).click()
  await expect(page).toHaveURL(/\/company\/northstar-tech$/)
  await expect(page.getByRole("heading", { name: "北辰智造科技" })).toBeVisible()
  await expect(page.getByRole("link", { name: "写评价" }).last()).toBeVisible()
})

test("researched companies are searchable and show source without invented reviews", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/companies")
  await expect(page.getByText("找到 29 家公司")).toBeVisible()
  await page.getByRole("checkbox", { name: "只看有评价" }).check()
  await expect(page.getByText("找到 3 家公司")).toBeVisible()
  await page.getByRole("checkbox", { name: "只看有评价" }).uncheck()
  await page.getByRole("textbox", { name: "搜索公司", exact: true }).fill("大疆")
  const company = page.getByRole("link", { name: /查看大疆创新/ })
  await expect(company).toContainText("暂无评分")
  await expect(company).toContainText("0 条评价")
  await company.click()
  await expect(page.getByRole("heading", { name: "大疆创新" })).toBeVisible()
  await expect(page.getByRole("complementary", { name: "公司公开资料" }).getByRole("link", { name: "查看资料来源" })).toHaveAttribute("href", "https://careers.dji.com/zh-CN/about")
  await expect(page.getByText("目前没有经过审核的站内评价。暂无评分不代表负面评价。")).toBeVisible()
  await expect(page.getByRole("complementary", { name: "公司证据摘要" })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
