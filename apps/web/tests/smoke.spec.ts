import { expect, test } from "@playwright/test"

test("首发首页与核心导航可访问", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "入职前，先看清方向" })).toBeVisible()
  await expect(page.getByRole("link", { name: "搜索公司" })).toBeVisible()
  await expect(page.getByRole("link", { name: "浏览研报" })).toBeVisible()
  await expect(page.getByRole("link", { name: "隐私政策" })).toBeVisible()
  await expect(page.getByRole("link", { name: "用户协议" })).toBeVisible()
})

test("研报 HTML 列表与详情可访问", async ({ page }) => {
  await page.goto("/research")
  await expect(page.getByRole("heading", { name: /公司真正的方向/ })).toBeVisible()
  const report = page.locator('a[href^="/research/"]').first()
  await expect(report).toBeVisible()
  await report.click()
  await expect(page).toHaveURL(/\/research\//)
  await expect(page.getByText("五维研究指数")).toBeVisible()
  await expect(page.getByText("阅读边界")).toBeVisible()
})

test("合规页面与账号数据入口可访问", async ({ page }) => {
  await page.goto("/legal/privacy")
  await expect(page.getByRole("heading", { name: "司南隐私政策" })).toBeVisible()
  await page.goto("/legal/terms")
  await expect(page.getByRole("heading", { name: "司南用户协议" })).toBeVisible()
  await page.goto("/settings/account")
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings%2Faccount$/)
  await expect(page.getByRole("heading", { name: "登录司南" })).toBeVisible()
})

test("无数据库时真实数据入口明确降级而非展示 mock", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText("公司数据暂时不可用，请稍后再试")).toBeVisible()
  await expect(page.getByText("北辰智造科技")).toHaveCount(0)

  await page.goto("/company/northstar-tech")
  await expect(page.getByText("公司数据暂时不可用。请稍后重试，评价不会回退到演示数据。")).toBeVisible()
  await expect(page.getByText("北辰智造科技")).toHaveCount(0)
})

test("匿名评价要求邀请制账号登录", async ({ request }) => {
  const response = await request.post("/api/reviews", {
    data: {
      companyId: "00000000-0000-0000-0000-000000000000",
      authorRole: "anonymous",
      title: "未登录提交测试",
      content: "这段内容长度足够，但没有登录会话，因此必须在访问数据库之前被拒绝。",
      directionScore: 8,
      ratingDimensions: {
        pay_worth: 8,
        growth: 8,
        leader: 8,
        overtime_truth: 8,
        promise_delivery: 8,
      },
    },
  })
  expect(response.status()).toBe(401)
})

test("健康检查区分存活与可接流状态", async ({ request }) => {
  const live = await request.get("/api/health/live")
  expect(live.status()).toBe(200)
  expect(await live.json()).toMatchObject({ status: "ok", service: "sinan-web" })

  const ready = await request.get("/api/health/ready")
  expect(ready.status()).toBe(503)
  expect(await ready.json()).toMatchObject({
    status: "not_ready",
    configuration: "invalid",
    database: "not_checked",
  })
})

test("受保护页面先登录并保留原目的地", async ({ page }) => {
  await page.goto("/submit/review?companyId=company-1")
  await expect(page).toHaveURL(/\/login\?next=%2Fsubmit%2Freview%3FcompanyId%3Dcompany-1$/)
  await expect(page.getByRole("heading", { name: "登录司南" })).toBeVisible()
  await expect(page.getByRole("link", { name: "注册" })).toHaveAttribute(
    "href",
    "/register?next=%2Fsubmit%2Freview%3FcompanyId%3Dcompany-1",
  )

  await page.goto("/settings/account")
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings%2Faccount$/)
})

test("登录表单首次提交就阻止无效输入", async ({ page }) => {
  await page.goto("/login?next=%2Fme")
  await page.getByLabel("邮箱", { exact: true }).fill("not-an-email")
  await page.getByLabel("密码", { exact: true }).fill("short")
  await page.getByRole("button", { name: "登录", exact: true }).click()
  await expect(page.getByText("邮箱格式看起来不太对,检查一下 @ 和域名")).toBeVisible()
  await expect(page.getByText("密码至少 8 位字符")).toBeVisible()
  await expect(page).toHaveURL(/\/login\?next=%2Fme$/)
})

test("登录后回到原页面并可从个人中心退出", async ({ page }) => {
  await page.goto("/login?next=%2Fme")
  await page.getByLabel("邮箱", { exact: true }).fill("test@sinan.app")
  await page.getByLabel("密码", { exact: true }).fill("test1234")
  await page.getByRole("button", { name: "登录", exact: true }).click()
  await expect(page).toHaveURL("/me")
  await expect(page.getByRole("heading", { name: "我的", exact: true })).toBeVisible()

  await page.getByRole("button", { name: "退出登录" }).click()
  await expect(page).toHaveURL("/")
  await expect(page.getByRole("link", { name: "登录" })).toBeVisible()
})

test("移动端主导航形成完整 App 闭环", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome")

  await page.goto("/")
  const appNav = page.getByRole("navigation", { name: "App 主导航" })
  await expect(appNav).toBeVisible()
  await expect(appNav.getByRole("link", { name: "推荐" })).toHaveAttribute("aria-current", "page")

  await appNav.getByRole("link", { name: "搜索" }).click()
  await expect(page).toHaveURL("/search")
  await expect(page.getByRole("navigation", { name: "App 主导航" }).getByRole("link", { name: "搜索" })).toHaveAttribute("aria-current", "page")

  await page.getByRole("navigation", { name: "App 主导航" }).getByRole("link", { name: "研报" }).click()
  await expect(page).toHaveURL("/research")
  await expect(page.getByRole("navigation", { name: "App 主导航" }).getByRole("link", { name: "研报" })).toHaveAttribute("aria-current", "page")
})

test("Web 可安装为独立 App", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest")
  expect(response.status()).toBe(200)
  expect(await response.json()).toMatchObject({
    name: "司南 · 职场方向助手",
    short_name: "司南",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FFFB",
    theme_color: "#19C37D",
  })
})

test("延期页面保留 App 恢复入口且仍返回 404", async ({ request }) => {
  const response = await request.get("/auction")
  expect(response.status()).toBe(404)
  expect(response.headers()["content-type"]).toContain("text/html")
  expect(await response.text()).toContain("这条路还没画在司南上")
})
