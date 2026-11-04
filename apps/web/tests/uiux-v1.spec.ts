import { expect, test } from "@playwright/test"

test("Zaichang uses Z across navigation and install icons without publishing the slogan", async ({ page, request }) => {
  await page.goto("/")
  await expect(page).toHaveTitle("在场")
  await expect(page.getByRole("link", { name: "返回在场首页" }).locator("img")).toHaveAttribute("src", "/brand-z.svg")
  await expect(page.locator("body")).not.toContainText("永远在场，永远连接")
  const manifest = await (await request.get("/manifest.webmanifest")).json()
  expect(manifest.name).toBe("在场")
  expect(manifest.icons.every((icon: { src: string }) => icon.src === "/icon.png")).toBe(true)
  for (const path of ["/icon.png", "/apple-icon.png", "/favicon.ico", "/brand-z.svg"]) {
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toMatch(/^image\//)
  }
})

for (const width of [390, 1440]) {
  test(`friend PR6 homepage retains feed tabs, original cards and newly listed rail ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.route("**/api/companies/search**", (route) => route.fulfill({ json: { companies: [
      { id: "old-rated", name: "评价最多公司", city: "上海", industry: "软件", reviewCount: 20, directionScore: 8, createdAt: "2026-01-01" },
      { id: "new-unrated", name: "最新收录公司", city: "北京", industry: "科技", reviewCount: 0, directionScore: 9, createdAt: "2026-11-01" },
    ] } }))
    await page.goto("/")
    const feed = page.getByRole("tabpanel")
    await expect(feed.getByTestId("company-feed-item").first()).toContainText("评价最多公司")
    await expect(feed.getByTestId("company-feed-item").first()).toContainText("综合评分 / 10")
    await page.getByRole("tab", { name: "最新", exact: true }).click()
    await expect(page.getByRole("tab", { name: "最新", exact: true })).toHaveAttribute("aria-selected", "true")
    await expect(feed.getByTestId("company-feed-item").first()).toContainText("最新收录公司")
    await expect(feed.getByTestId("company-feed-item").first()).toContainText("暂无评分")
    await page.getByRole("tab", { name: "推荐", exact: true }).click()
    await expect(feed.getByTestId("company-feed-item").first()).toContainText("评价最多公司")
    if (width >= 1024) {
      const rail = page.getByRole("region", { name: "新收录公司", exact: true })
      await expect(rail.getByRole("link", { name: /最新收录公司/ })).toBeVisible()
      await expect(rail.getByRole("link", { name: /评价最多公司/ })).toHaveCount(0)
    }
    await expect(page.getByRole("heading", { name: "公司速览" })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`friend-home-${width}.png`), fullPage: true })
  })
}

test("quick review skips detailed ratings without submitting fabricated defaults", async ({ page }) => {
  const company = { id: "quick-company", name: "快速评价公司", city: "北京", industry: "软件", reviewStatus: "reviewable" }
  let submitted: Record<string, unknown> | undefined
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: { user: { id: "fixture", role: "user", displayName: "测试" } } }))
  await page.route("**/api/companies/quick-company", (route) => route.fulfill({ json: { company } }))
  await page.route("**/api/companies/quick-company/departments", (route) => route.fulfill({ json: { departments: [] } }))
  await page.route("**/api/reviews", (route) => {
    submitted = route.request().postDataJSON()
    return route.fulfill({ status: 503, json: { error: "隔离测试提交失败" } })
  })
  await page.goto("/submit/review?companyId=quick-company&directionScore=0")
  await page.getByLabel("岗位", { exact: false }).fill("工程师")
  await page.getByLabel("工作城市", { exact: false }).fill("杭州")
  await page.getByTestId("company-step-next-button").click()
  await expect(page.getByText("补充分项评分（选填）", { exact: true })).toBeVisible()
  await expect(page.getByLabel("薪酬值得", { exact: true })).toBeHidden()
  await page.getByTestId("review-next").click()
  await page.getByTestId("review-title-input").fill("这是一条真实经历的标题")
  await page.getByLabel("评价内容", { exact: false }).fill("这是一条足够长的隔离测试评价，验证快速评价不会把没有回答的分项评分或者面试难度默认为真实评分。")
  await page.getByRole("button", { name: /匿名安全检查/ }).click()
  await page.getByTestId("submit-review-button").click()
  await expect(page.locator("form").getByRole("alert")).toContainText("隔离测试提交失败")
  expect(submitted).toMatchObject({ directionScore: 0, city: "杭州", ratingDimensions: {} })
  expect(submitted?.questionnaire).not.toHaveProperty("interviewDifficulty")
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test("feed tabs cannot silently swallow clicks before hydration on a slow connection", async ({ page }) => {
  let releaseScripts!: () => void
  const scriptsReady = new Promise<void>((resolve) => { releaseScripts = resolve })
  await page.route("**/_next/static/**/*.js", async (route) => {
    await scriptsReady
    await route.continue()
  })
  try {
    await page.goto("/", { waitUntil: "commit" })
    const latest = page.getByRole("tab", { name: "最新", exact: true })
    await expect(latest).toBeVisible()
    await expect(latest).toBeDisabled()
    await expect(page.getByRole("tablist", { name: "推荐信息流" })).toHaveAttribute("aria-busy", "true")
    releaseScripts()
    await expect(latest).toBeEnabled()
    await latest.click()
    await expect(latest).toHaveAttribute("aria-selected", "true")
    await expect(page.getByRole("tablist", { name: "推荐信息流" })).toHaveAttribute("aria-busy", "false")
  } finally { releaseScripts() }
})

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
        await expect(page.getByTestId(name === "home" ? "company-feed-item" : "company-directory-item").filter({ hasText: "北辰" }).first()).toBeVisible()
        await expect(page.getByRole("link", { name: "搜索公司", exact: true })).toHaveCount(0)
      } else {
        await expect(page.getByRole("navigation", { name: "公司信息导航" }).getByRole("link", { name: "评分", exact: true })).toHaveAttribute("href", "/company/northstar-tech/ratings")
        await expect(page.getByRole("navigation", { name: "公司信息导航" }).getByRole("link", { name: "概览" })).toHaveAttribute("aria-current", "page")
        await expect(page.getByText("★★★★☆")).toHaveCount(0)
        await expect(page.getByRole("button", { name: "关注公司" })).toHaveCount(0)
        await expect(page.getByRole("combobox", { name: "评价分类" })).toBeVisible()
        await page.getByRole("combobox", { name: "评价分类" }).selectOption("最新")
        await expect(page.getByRole("link", { name: "写评价", exact: true }).last()).toHaveAttribute("href", /companyId=northstar-tech/)
      }
      await expect(page.getByRole("button", { name: "通知", exact: true })).toHaveCount(0)
      await expect(page.getByRole("link", { name: "登录", exact: true })).toBeVisible()
      await expect(page.getByRole("link", { name: "注册", exact: true })).toBeVisible()
      if (name === "companies") {
        const columns = await page.getByTestId("company-directory-grid").evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(" ").length)
        expect(columns).toBe(width >= 1024 ? 2 : 1)
      }
      if (width < 1024) {
        await expect(page.getByRole("navigation", { name: "快捷导航" }).getByRole("link", { name: "评分", exact: true })).toBeVisible()
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

test("integrated community has a real empty state, never demo discussions", async ({ page }) => {
  await page.route("**/api/community**", (route) => route.fulfill({ json: { discussions: [], limit: 50 } }))
  const response = await page.goto("/community")
  expect(response?.status()).toBe(200)
  await expect(page.getByRole("heading", { name: "社区", exact: true })).toBeVisible()
  await expect(page.getByText("没有匹配的社区讨论", { exact: true })).toBeVisible()
  await expect(page.locator("article")).toHaveCount(0)
  await expect(page.locator("body")).not.toContainText("产品演示讨论")
})

for (const width of [375, 1280]) {
  test(`PR5 filters integrate with existing real-data directory ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.route("**/api/companies/search**", (route) => route.fulfill({ json: { companies: [
      { id: "empty", name: "新收录公司", city: "杭州", industry: "科技", reviewCount: 0, directionScore: 10, recommendationRate: 100, createdAt: "2026-10-31", aliases: ["新星"], englishName: "New Star" },
      { id: "rated", name: "真实零分公司", city: "杭州", industry: "科技", reviewCount: 1, directionScore: 0, recommendationRate: 0, createdAt: "2026-01-01" },
    ] } }))
    await page.goto("/companies")
    await page.getByLabel("排序", { exact: false }).selectOption("score")
    await expect(page.getByTestId("company-directory-item").first()).toContainText("真实零分公司")
    await page.getByLabel("排序", { exact: false }).selectOption("recent")
    await expect(page.getByTestId("company-directory-item").first()).toContainText("新收录公司")
    await page.getByRole("checkbox", { name: "只看有评价" }).check()
    await expect(page.getByTestId("company-directory-item")).toHaveCount(1)
    await page.getByRole("textbox", { name: "搜索公司", exact: true }).fill("不存在")
    await page.getByRole("button", { name: "清除筛选", exact: true }).click()
    await expect(page.getByRole("checkbox", { name: "只看有评价" })).not.toBeChecked()
    await expect(page.getByTestId("company-directory-item")).toHaveCount(2)
    await page.getByRole("textbox", { name: "搜索公司", exact: true }).fill("新星")
    await expect(page.getByTestId("company-directory-item")).toHaveCount(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`directory-integrated-${width}.png`), fullPage: true })
  })
}

test("restored ratings preserve the selected draft and company through login", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const response = await page.goto("/company/northstar-tech/ratings")
  expect(response?.status()).toBe(200)
  await expect(page.getByRole("heading", { name: "公司评分", exact: true })).toBeVisible()
  const next = page.getByRole("button", { name: "继续提交评价" })
  await expect(next).toBeDisabled()
  const zero = page.getByRole("radio", { name: "0 分", exact: true })
  await expect(zero).toBeEnabled()
  await zero.check({ force: true })
  await expect(page.getByText("你的方向分：0 / 10")).toBeVisible()
  await next.click()
  await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("next") === "/submit/review?companyId=northstar-tech&directionScore=0")
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test("public help is reachable, honest about contact configuration, and keyboard accessible", async ({ page }) => {
  await page.goto("/support")
  await page.keyboard.press("Tab")
  await expect(page.getByRole("link", { name: "跳到主要内容" })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.locator("#main-content")).toBeFocused()
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "帮助与反馈" })).toHaveAttribute("href", "/support")
  await expect(page.locator('a[href="mailto:support@sinanapp.cn"]')).toHaveCount(0)
  await expect(page.getByRole("main").getByRole("link", { name: "账号与数据" })).toHaveAttribute("href", "/settings/account")
  await page.goto("/legal/privacy")
  await expect(page.locator('a[href="mailto:support@sinanapp.cn"]')).toHaveCount(0)
})

test("directory loading matches responsive cards and keeps short-page footer at the bottom", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1100 })
  let release!: () => void
  const pending = new Promise<void>((resolve) => { release = resolve })
  await page.route("**/api/companies/search**", async (route) => {
    await pending
    await route.fulfill({ json: { companies: [] } })
  })
  try {
    await page.goto("/companies")
    await expect(page.getByRole("status", { name: "正在加载公司" })).toBeVisible()
    const grid = page.getByTestId("directory-loading-grid")
    expect(await grid.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length)).toBe(2)
    await page.setViewportSize({ width: 375, height: 812 })
    expect(await grid.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length)).toBe(1)
  } finally { release() }
  await expect(page.getByRole("button", { name: "清除筛选" })).toBeVisible()
  await page.setViewportSize({ width: 1280, height: 1100 })
  const footer = await page.getByRole("contentinfo").boundingBox()
  expect(footer!.y + footer!.height).toBeGreaterThanOrEqual(1099)
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
  const contrasts = await page.evaluate(() => {
    const context = document.createElement("canvas").getContext("2d")!
    const luminance = (color: string) => {
      context.fillStyle = color
      context.fillRect(0, 0, 1, 1)
      const rgb = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map((channel) => {
        const c = channel / 255
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      })
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
    }
    const ratio = (foreground: string, background: string) => {
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
      return (values[0] + 0.05) / (values[1] + 0.05)
    }
    const card = document.querySelector('[data-testid="company-directory-item"]')!
    const score = card.querySelector('[aria-label^="方向评分"]')!
    const register = document.querySelector('a[href="/register"]')!
    return [
      ratio(getComputedStyle(score).color, getComputedStyle(card).backgroundColor),
      ratio(getComputedStyle(register).color, getComputedStyle(register).backgroundColor),
    ]
  })
  for (const contrast of contrasts) expect(contrast).toBeGreaterThanOrEqual(4.5)
  await page.screenshot({ path: testInfo.outputPath("directory-dark.png"), fullPage: true })
})
