import { expect, test, type Page } from "@playwright/test"
const sessionId = "30000000-0000-4000-8000-000000000001", applicationId = "40000000-0000-4000-8000-000000000001"
const session = { id: sessionId, title: "聊聊跨团队协作和真实工作节奏", description: "本场为隔离页面测试活动，围绕日常协作、工作节奏和职业经历进行交流，不代表真实已发布活动。", guestName: "测试嘉宾", guestBio: "拥有跨团队项目协作经验，愿意分享真实工作中的方法和反思。", companyId: null, companyName: null, durationMinutes: 45, capacity: 1, startsAt: "2030-01-02T04:00:00Z", signupEndsAt: "2030-01-01T04:00:00Z", fundingMode: "undecided", status: "open", recap: "", cancelReason: null, createdAt: "2026-11-22T00:00:00Z", paymentsEnabled: false, biddingEnabled: false, donationStatus: "not_started" }
async function fixture(page: Page, signedIn = false) {
  await page.route("**/api/auth/me", route => route.fulfill({ json: { user: signedIn ? { id: "dialogue-ui", role: "user" } : null } }))
  await page.route("**/api/companies/search**", route => route.fulfill({ json: { companies: [] } }))
  await page.route("**/api/forum/posts?**", route => route.fulfill({ json: { posts: [], nextCursor: null } }))
  await page.route("**/api/dialogues**", route => {
    const url = new URL(route.request().url())
    if (url.pathname === `/api/dialogues/${sessionId}`) return route.fulfill({ json: { session } })
    if (url.pathname === "/api/dialogues") return route.fulfill({ json: { sessions: [session], nextCursor: null } })
    return route.fallback()
  })
}
for (const width of [320, 390, 1280]) for (const theme of ["light", "dark"]) {
  test(`dialogue belongs to community and never offers money ${width}px ${theme}`, async ({ page }, info) => {
    await fixture(page); await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(theme => localStorage.setItem("sinan:theme", theme), theme)
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message))
    await page.goto("/community")
    await page.getByRole("link", { name: "对话", exact: true }).click()
    await expect(page).toHaveURL(/\/community\/dialogues$/)
    await expect(page.getByTestId("dialogue-card")).toHaveCount(1)
    await expect(page.getByTestId("dialogue-editorial-hero").locator('svg[data-dialogue-art="two-chairs"]')).toBeVisible()
    const nav = page.getByRole("navigation", { name: width < 1024 ? "快捷导航" : "主导航" })
    await expect(nav.getByRole("link")).toHaveCount(2)
    await expect(nav.getByRole("link", { name: "社区", exact: true })).toHaveAttribute("aria-current", "page")
    await expect(page.getByText(/不可充值、转让或提现/)).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath("dialogue-list.png"), fullPage: true })
    await page.getByRole("link", { name: "查看活动", exact: true }).click()
    await expect(page.getByRole("heading", { name: session.title, exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "登录后报名提问" })).toHaveAttribute("href", `/login?next=%2Fcommunity%2Fdialogues%2F${sessionId}`)
    await expect(page.getByRole("button", { name: /出价|支付|捐款|立即成交/ })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath("dialogue-detail.png"), fullPage: true })
    await page.getByRole("link", { name: "登录后报名提问" }).click()
    await expect(page).toHaveURL(url => url.pathname === "/login" && url.searchParams.get("next") === `/community/dialogues/${sessionId}`)
    expect(errors).toEqual([])
  })
}
test("honest activity failures support retry and pagination preserves prior cards", async ({ page }) => {
  await fixture(page); let fail = true
  await page.route("**/api/dialogues**", route => {
    const next = new URL(route.request().url()).searchParams.has("cursor")
    return route.fulfill(fail ? { status: 503, json: { error: "暂时不可用" } } : { json: { sessions: [{ ...session, id: next ? "30000000-0000-4000-8000-000000000002" : sessionId, title: next ? "第二场隔离测试对话" : session.title }], nextCursor: next ? null : "fixture-cursor" } })
  })
  await page.goto("/community/dialogues")
  await expect(page.getByRole("main").getByRole("alert")).toContainText("对话活动暂时无法加载")
  await expect(page.getByText("还没有公开的对话活动")).toHaveCount(0)
  fail = false; await page.getByRole("button", { name: "重试", exact: true }).click()
  await expect(page.getByTestId("dialogue-card")).toHaveCount(1)
  fail = true; await page.getByRole("button", { name: "更多活动", exact: true }).click()
  await expect(page.getByText("后续活动加载失败，已加载内容保留。")).toBeVisible()
  await expect(page.getByTestId("dialogue-card")).toHaveCount(1)
  fail = false; await page.getByRole("button", { name: "重试更多活动", exact: true }).click()
  await expect(page.getByTestId("dialogue-card")).toHaveCount(2)
})
for (const width of [320, 768, 1280]) for (const theme of ["light", "dark"]) {
  test(`editorial dialogue handles long real-shaped content ${width}px ${theme}`, async ({ page }, info) => {
    await fixture(page, true)
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(theme => localStorage.setItem("sinan:theme", theme), theme)
    const long = { ...session, title: "跨团队协作与真实工作节奏".repeat(8), guestName: "长名字嘉宾".repeat(16), companyName: "一家有很长注册名称的公司".repeat(6), companyId: "60000000-0000-4000-8000-000000000001", description: "隔离测试中的完整话题，验证正文不会被截断或横向溢出。".repeat(20), guestBio: "隔离测试嘉宾介绍，用于检查文字排版和阅读体验。".repeat(20) }
    await page.route(`**/api/dialogues/${sessionId}`, route => route.fulfill({ json: { session: long } }))
    await page.goto(`/community/dialogues/${sessionId}`)
    await expect(page.getByRole("heading", { name: long.title, exact: true })).toBeVisible()
    await expect(page.getByText(long.description, { exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "全部对话", exact: true })).toHaveAttribute("href", "/community/dialogues")
    const field = page.getByLabel("报名问题", { exact: true })
    await field.focus(); await expect(field).toBeFocused()
    await expect(field).toHaveAccessibleDescription(/问题仅你与活动管理者可见/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath("dialogue-long-content.png"), fullPage: true })
  })
}
test("editorial controls keep contrast, keyboard navigation and reduced-motion preferences", async ({ page }) => {
  await fixture(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  for (const theme of ["light", "dark"]) {
    await page.addInitScript(theme => localStorage.setItem("sinan:theme", theme), theme)
    await page.goto("/community/dialogues")
    await expect(page.getByTestId("dialogue-card")).toHaveCount(1)
    const ratios = await page.evaluate(() => {
      const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d")!
      const luma = (color: string) => {
        ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1)
        const rgb = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4 })
        return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
      }
      const hero = document.querySelector('[data-testid="dialogue-editorial-hero"]')!, card = document.querySelector('[data-testid="dialogue-card"]')!
      const pairs = [[hero.querySelector("h2 span")!, hero], [hero.querySelector("p:not([aria-hidden])")!, hero], [card.querySelector('a:last-child')!, card]]
      return pairs.map(([text, bg]) => { const a = luma(getComputedStyle(text).color), b = luma(getComputedStyle(bg).backgroundColor); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05) })
    })
    expect(ratios.every(value => value >= 4.5)).toBe(true)
    const jump = page.getByRole("link", { name: "浏览对话", exact: true })
    await jump.focus(); await expect(jump).toBeFocused(); await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/#dialogue-events$/)
    await page.getByTestId("dialogue-card").hover()
    expect(await page.getByTestId("dialogue-card").evaluate(element => getComputedStyle(element).transform)).toBe("none")
    // The existing global reduced-motion rule keeps a 0.01ms duration so
    // transition-end listeners can settle; it is effectively instantaneous.
    const durations = await page.getByTestId("dialogue-card").evaluate(element => getComputedStyle(element).transitionDuration.split(",").map(value => Number.parseFloat(value)))
    expect(durations.every(value => value <= .00002)).toBe(true)
  }
})
test("guests cannot be invited to apply to expired activities and selected tickets remain usable on mobile", async ({ page }, info) => {
  await page.clock.install({ time: new Date("2030-01-01T05:00:00Z") })
  await fixture(page)
  await page.goto(`/community/dialogues/${sessionId}`)
  await expect(page.getByText("本场活动已停止报名。", { exact: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "登录后报名提问" })).toHaveCount(0)
  await fixture(page, true)
  await page.setViewportSize({ width: 320, height: 900 })
  await page.route("**/api/me/dialogues", route => route.fulfill({ json: { applications: [{ id: applicationId, sessionId, sessionTitle: session.title, sessionStatus: "open", startsAt: session.startsAt, question: "我希望了解跨团队的协作和工作节奏。", status: "selected", decisionNote: "提问适合本次交流", createdAt: session.createdAt, privateInstructions: "隔离测试参与方式，仅本人可见。" }], nextCursor: null } }))
  await page.goto("/me/dialogues")
  await expect(page.getByRole("heading", { name: "仅入选者可见的参与安排" })).toBeVisible()
  const titleBox = await page.getByRole("heading", { name: session.title, exact: true }).boundingBox()
  expect(titleBox!.width).toBeGreaterThanOrEqual(160)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole("button", { name: "撤回报名", exact: true }).click()
  await page.getByRole("button", { name: "保留报名", exact: true }).click()
  await page.screenshot({ path: info.outputPath("dialogue-my-ticket-mobile.png"), fullPage: true })
  await page.route("**/api/me/dialogues", route => route.fulfill({ json: { applications: [{ id: applicationId, sessionId, sessionTitle: session.title, sessionStatus: "cancelled", startsAt: session.startsAt, question: "我希望了解跨团队的协作和工作节奏。", status: "selected", decisionNote: null, createdAt: session.createdAt, privateInstructions: "不应再展示的旧参与安排" }], nextCursor: null } }))
  await page.getByRole("button", { name: "刷新状态", exact: true }).click()
  await expect(page.getByText("已入选 · 已取消", { exact: true })).toBeVisible()
  await expect(page.getByText("不应再展示的旧参与安排", { exact: true })).toHaveCount(0)
})
test("failed applications preserve questions and request identity; success means waiting for review", async ({ page }) => {
  await fixture(page, true); let fail = true
  const payloads: { question: string; requestId: string }[] = []
  const question = "希望了解跨团队沟通以及工作节奏如何安排？"
  await page.route(`**/api/dialogues/${sessionId}/applications`, route => {
    payloads.push(route.request().postDataJSON())
    return route.fulfill(fail ? { status: 503, json: { error: "报名暂时不可用" } } : { status: 201, json: { application: { id: applicationId, sessionId, question, status: "submitted", decisionNote: null, createdAt: "2026-11-22T00:00:00Z" } } })
  })
  await page.goto(`/community/dialogues/${sessionId}`)
  await page.getByLabel("报名问题", { exact: true }).fill(question)
  await page.getByRole("button", { name: "免费报名", exact: true }).click()
  await expect(page.locator("form").getByRole("alert")).toHaveText("报名暂时不可用")
  await expect(page.getByLabel("报名问题", { exact: true })).toHaveValue(question)
  await expect(page.getByLabel("报名问题", { exact: true })).toHaveAttribute("aria-invalid", "false")
  await expect(page.getByText("报名已提交，等待审核。")).toHaveCount(0)
  fail = false; await page.getByRole("button", { name: "免费报名", exact: true }).click()
  await expect(page.getByText("报名已提交，等待审核。")).toBeVisible()
  expect(payloads).toHaveLength(2); expect(payloads[0]).toEqual(payloads[1])
  expect(Object.keys(payloads[0]).sort()).toEqual(["question", "requestId"])
})
test("selected-only arrangements disappear only after confirmed successful withdrawal", async ({ page }) => {
  await fixture(page, true); let withdrawn = false, fail = true, deletes = 0
  await page.route("**/api/me/dialogues", route => route.fulfill({ json: { applications: [{ id: applicationId, sessionId, sessionTitle: session.title, sessionStatus: "open", startsAt: session.startsAt, question: withdrawn ? "" : "报名问题仅自己和管理者可见。", status: withdrawn ? "withdrawn" : "selected", decisionNote: null, createdAt: "2026-11-22T00:00:00Z", privateInstructions: withdrawn ? null : "PRIVATE-ONLY-MEETING" }], nextCursor: null } }))
  await page.route(`**/api/me/dialogues/${applicationId}`, route => {
    deletes++; if (fail) return route.fulfill({ status: 503, json: { error: "撤回失败，请重试" } })
    withdrawn = true; return route.fulfill({ json: { id: applicationId, status: "withdrawn" } })
  })
  await page.goto("/me/dialogues")
  await expect(page.getByText("PRIVATE-ONLY-MEETING")).toBeVisible()
  await page.getByRole("button", { name: "撤回报名", exact: true }).click()
  expect(deletes).toBe(0)
  await page.getByRole("button", { name: "保留报名", exact: true }).click()
  expect(deletes).toBe(0)
  await page.getByRole("button", { name: "撤回报名", exact: true }).click()
  await page.getByRole("button", { name: "确认撤回报名", exact: true }).click()
  await expect(page.getByRole("main").getByRole("alert")).toContainText("撤回失败，请重试")
  await expect(page.getByText("PRIVATE-ONLY-MEETING")).toBeVisible()
  fail = false; await page.getByRole("button", { name: "确认撤回报名", exact: true }).click()
  await expect(page.getByText("报名问题已清除", { exact: true })).toBeVisible()
  await expect(page.getByText("PRIVATE-ONLY-MEETING")).toHaveCount(0)
  expect(deletes).toBe(2)
})
test("an activity deadline closes an already open form without a page reload", async ({ page }) => {
  await page.clock.install({ time: new Date("2030-01-01T03:59:59Z") })
  await fixture(page, true)
  await page.goto(`/community/dialogues/${sessionId}`)
  await expect(page.getByRole("button", { name: "免费报名", exact: true })).toBeVisible()
  await page.clock.fastForward(2000)
  await expect(page.getByText("本场活动已停止报名。", { exact: false })).toBeVisible()
  await expect(page.getByRole("button", { name: "免费报名", exact: true })).toHaveCount(0)
})
test("empty and guest personal states are truthful; real endpoints fail closed without a DB", async ({ page, request }) => {
  await fixture(page)
  await page.route("**/api/dialogues", route => route.fulfill({ json: { sessions: [], nextCursor: null } }))
  await page.goto("/community/dialogues")
  await expect(page.getByRole("heading", { name: "还没有公开的对话活动" })).toBeVisible()
  await page.goto("/me/dialogues")
  await expect(page.getByRole("link", { name: "登录后查看报名" })).toHaveAttribute("href", "/login?next=%2Fme%2Fdialogues")
  expect((await request.get("/api/dialogues")).status()).toBe(503)
  for (const path of ["/api/me/dialogues", "/api/moderation/dialogues"]) expect((await request.get(path)).status()).toBe(401)
  expect((await request.post(`/api/dialogues/${sessionId}/applications`, { data: { question: "访谈问题也需要登录后提交？", requestId: "50000000-0000-4000-8000-000000000001" } })).status()).toBe(401)
  expect((await request.get("/auction")).status()).toBe(404)
  expect((await request.post(`/api/dialogues/${sessionId}/checkout`, { data: { amount: 1 } })).status()).toBe(404)
  await page.goto("/legal/privacy")
  await expect(page.getByRole("heading", { name: "对话活动与积分", exact: true })).toBeVisible()
  await expect(page.getByText(/撤回报名会清除报名问题、处理说明/)).toBeVisible()
  await page.goto("/legal/terms")
  await expect(page.getByText(/不提供现金竞拍、收款、捐赠或公益凭证/)).toBeVisible()
  await expect(page.getByText(/不可充值、购买、转让或提现/)).toBeVisible()
})
