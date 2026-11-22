import { expect, test, type Page } from "@playwright/test"

const companyId = "10000000-0000-4000-8000-000000000001"
const postId = "20000000-0000-4000-8000-000000000001"
const companies = ["字节跳动", "腾讯", "美团", "小红书"].map((name, index) => ({ id: index ? `10000000-0000-4000-8000-00000000000${index + 1}` : companyId, name, shortName: name, city: "上海", industry: "互联网", reviewCount: 0 }))
const posts = [
  { title: "你们团队下班以后，还会回消息吗？", content: "最近想把工作和生活分开一点。想听听大家平时是怎么和同事约定沟通时间的。", category: "question" },
  { title: "面试时聊的工作，入职后有变化吗？", content: "比起岗位名称，我现在更关心每天具体做什么，以及团队如何分配任务。你们会在面试时确认哪些细节？", category: "interview" },
  { title: "分享一个最近觉得协作很舒服的瞬间", content: "把任务背景写清楚，遇到问题先对齐信息，再讨论怎么办。其实都是小事，但工作起来真的轻松了不少。", category: "experience" },
].map((entry, index) => ({ ...entry, id: index ? `20000000-0000-4000-8000-00000000000${index + 1}` : postId, companyId: companies[index].id, companyName: companies[index].name, status: "visible", authorLabel: "匿名成员", isMine: false, usefulCount: 0, replyCount: 0, isUseful: false, createdAt: "2026-11-21T03:00:00Z" }))

async function fixture(page: Page) {
  await page.route("**/api/auth/me", route => route.fulfill({ json: { user: null } }))
  await page.route("**/api/companies/search**", route => route.fulfill({ json: { companies } }))
  await page.route("**/api/forum/posts?**", route => route.fulfill({ json: { posts, nextCursor: null } }))
  await page.route(`**/api/forum/posts/${postId}`, route => route.fulfill({ json: { post: posts[0], replies: [], myReplies: [], nextCursor: null } }))
  await page.route("**/api/reviews?**", route => route.fulfill({ json: { reviews: [], nextCursor: null } }))
  await page.route("**/api/community?**", route => route.fulfill({ json: { discussions: [] } }))
}

for (const width of [320, 390, 1280]) for (const theme of ["light", "dark"]) {
  test(`lightweight discussion and SVGs ${width}px ${theme}`, async ({ page }, info) => {
    await fixture(page)
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(theme => localStorage.setItem("sinan:theme", theme), theme)
    const errors: string[] = []
    page.on("pageerror", error => errors.push(error.message))
    await page.goto("/community")
    await expect(page.getByTestId("forum-post")).toHaveCount(3)
    await expect(page.getByTestId("community-filters")).not.toHaveAttribute("open", "")
    await expect(page.getByRole("complementary", { name: "社区快捷入口" })).toHaveCount(0)
    const icon = page.locator('svg[data-brand-icon="conversation"]').first()
    await expect.poll(() => icon.evaluate(element => element instanceof SVGGraphicsElement ? element.getBBox().width : 0)).toBeGreaterThan(0)
    if (width < 1024) {
      await expect(page.getByLabel("查找公司论坛", { exact: true })).toBeHidden()
      await page.getByRole("button", { name: "找公司", exact: true }).click()
      await expect(page.getByLabel("查找公司论坛", { exact: true })).toBeVisible()
      await page.getByRole("button", { name: "找公司", exact: true }).click()
    } else await expect(page.getByLabel("查找公司论坛", { exact: true })).toBeVisible()
    await expect(page.getByRole("navigation", { name: "社区板块" }).getByRole("link", { name: "聊工作" })).toHaveAttribute("aria-current", "page")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath("community.png"), fullPage: true })
    await page.getByRole("heading", { name: posts[0].title }).click()
    await expect(page.getByRole("heading", { name: posts[0].title })).toBeVisible()
    await expect(page.getByRole("link", { name: "登录后回复" })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath("thread.png"), fullPage: true })
    expect(errors).toEqual([])
  })
}

test("reviews use the existing real API, preserve zero, and keep masked content private", async ({ page }) => {
  await fixture(page)
  const review = { id: "review-real-contract", companyId, title: "这份工作的真实体验", content: null, summary: "不得作为遮罩内容的回退", directionScore: "0", authorLabel: "匿名同事", usefulCount: 0, status: "limited_visible" }
  const requests: URL[] = []
  let discussionRequests = 0
  await page.route("**/api/community?**", route => { discussionRequests++; return route.fulfill({ json: { discussions: [] } }) })
  await page.route("**/api/reviews?**", route => { requests.push(new URL(route.request().url())); return route.fulfill({ json: { reviews: [review], nextCursor: null } }) })
  await page.goto(`/community?companyId=${companyId}`)
  await expect(page.getByRole("link", { name: "评价这家公司" })).toHaveAttribute("href", `/submit/review?companyId=${companyId}`)
  await page.getByRole("navigation", { name: "社区板块" }).getByRole("link", { name: "公司评价" }).click()
  const card = page.getByTestId("community-company-review")
  await expect(card).toContainText("0.0/ 10")
  await expect(card).toContainText("内容暂不可见")
  await expect(page.getByText(review.summary)).toHaveCount(0)
  await expect(card.getByRole("link", { name: "查看评价与讨论" })).toHaveAttribute("href", `/company/${companyId}/reviews/${review.id}`)
  expect(requests[0].searchParams.get("companyId")).toBe(companyId)
  await expect(page.getByTestId("legacy-review-discussions")).not.toHaveAttribute("open", "")
  expect(discussionRequests).toBe(0)
  await page.getByTestId("legacy-review-discussions").locator("summary").focus()
  await page.keyboard.press("Enter")
  await expect.poll(() => discussionRequests).toBe(1)
  await page.getByRole("navigation", { name: "社区板块" }).getByRole("link", { name: "聊工作" }).click()
  await expect(page.getByTestId("forum-post")).toHaveCount(3)
  await expect(page).toHaveURL(url => url.searchParams.get("companyId") === companyId && !url.searchParams.has("view"))
  await page.goBack()
  await expect(card).toBeVisible()
  await page.reload()
  await expect(card).toBeVisible()
})

test("review failure is not an empty success, retries and pagination keep prior rows", async ({ page }) => {
  await fixture(page)
  let fail = true
  await page.route("**/api/reviews?**", route => {
    if (fail) return route.fulfill({ status: 503, json: { error: "unavailable" } })
    const next = new URL(route.request().url()).searchParams.has("cursor")
    return route.fulfill({ json: { reviews: [{ id: next ? "second" : "first", companyId, title: next ? "第二条真实评价" : "第一条真实评价", content: "已审核的评价内容", directionScore: "8", authorLabel: "匿名同事", usefulCount: 0 }], nextCursor: next ? null : "next-fixture" } })
  })
  await page.goto("/community?view=reviews")
  await expect(page.getByRole("region", { name: "公司评价信息流" }).getByRole("alert")).toContainText("公司评价暂时无法加载")
  await expect(page.getByText("还没有公开的公司评价")).toHaveCount(0)
  fail = false
  await page.getByRole("button", { name: "重试公司评价" }).click()
  await expect(page.getByTestId("community-company-review")).toHaveCount(1)
  fail = true
  await page.getByRole("button", { name: "更多公司评价" }).click()
  await expect(page.getByText("后续评价加载失败，已加载内容保留。")).toBeVisible()
  await expect(page.getByTestId("community-company-review")).toHaveCount(1)
  fail = false
  await page.getByRole("button", { name: "重试更多评价" }).click()
  await expect(page.getByTestId("community-company-review")).toHaveCount(2)
})

test("empty discussions show original artwork, never seeded activity", async ({ page }, info) => {
  await fixture(page)
  await page.setViewportSize({ width: 390, height: 900 })
  await page.route("**/api/forum/posts?**", route => route.fulfill({ json: { posts: [], nextCursor: null } }))
  await page.goto("/community")
  await expect(page.getByRole("heading", { name: "还没有公开帖子" })).toBeVisible()
  await expect.poll(() => page.locator('svg[data-brand-icon="quiet"]').evaluate(element => element instanceof SVGGraphicsElement ? element.getBBox().width : 0)).toBeGreaterThan(0)
  await expect(page.getByTestId("forum-post")).toHaveCount(0)
  await page.screenshot({ path: info.outputPath("empty-community.png"), fullPage: true })
})

for (const width of [390, 1280]) for (const theme of ["light", "dark"]) {
  test(`companies are part of the community journey ${width}px ${theme}`, async ({ page }, info) => {
    await fixture(page)
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(theme => localStorage.setItem("sinan:theme", theme), theme)
    const requests: URL[] = []
    await page.route("**/api/forum/posts?**", route => {
      requests.push(new URL(route.request().url()))
      return route.fulfill({ json: { posts, nextCursor: null } })
    })
    await page.goto("/")
    await expect(page.getByRole("heading", { name: "社区", exact: true })).toBeVisible()
    await expect(page.getByTestId("forum-post")).toHaveCount(3)
    const nav = page.getByRole("navigation", { name: width < 1024 ? "快捷导航" : "主导航" })
    await expect(nav.getByRole("link")).toHaveCount(2)
    await expect(nav.getByRole("link", { name: "社区", exact: true })).toHaveAttribute("aria-current", "page")
    await expect(nav.getByRole("link", { name: "公司", exact: true })).toHaveCount(0)
    const boards = page.getByRole("navigation", { name: "社区板块" })
    const beforeDiscovery = requests.length
    await boards.getByRole("link", { name: "找公司", exact: true }).click()
    await expect(page.getByTestId("home-recommend-feed")).toBeVisible()
    await expect(page.getByTestId("company-feed-item")).toHaveCount(4)
    await expect(boards.getByRole("link", { name: "找公司", exact: true })).toHaveAttribute("aria-current", "page")
    expect(requests.length).toBe(beforeDiscovery)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath("community-company-discovery.png"), fullPage: true })
    await page.getByTestId("home-recommend-feed").getByRole("link", { name: "全部公司", exact: true }).click()
    await expect(page.getByTestId("company-directory")).toBeVisible()
    await expect(nav.getByRole("link", { name: "社区", exact: true })).toHaveAttribute("aria-current", "page")
    await page.getByLabel("城市", { exact: false }).selectOption("上海")
    await page.getByLabel("排序", { exact: false }).selectOption("score")
    await expect(page).toHaveURL(url => url.pathname === "/companies" && url.searchParams.get("sort") === "score")
    await page.reload()
    await expect(page.getByLabel("排序", { exact: false })).toHaveValue("score")
    await boards.getByRole("link", { name: "聊工作", exact: true }).click()
    await expect(page.getByTestId("forum-post")).toHaveCount(3)
    await expect(page).toHaveURL(/\/community$/)
    expect(requests.at(-1)?.searchParams.get("sort")).toBe("latest")
    expect(requests.at(-1)?.searchParams.has("city")).toBe(false)
    await page.goBack()
    await expect(page.getByTestId("company-directory")).toBeVisible()
    await expect(page.getByLabel("排序", { exact: false })).toHaveValue("score")
    await boards.getByRole("link", { name: "公司评价", exact: true }).click()
    await expect(page.getByRole("region", { name: "公司评价信息流" })).toBeVisible()
    await expect(page).toHaveURL(/\/community\?view=reviews$/)
  })
}

test("company details and scoring remain inside community navigation", async ({ page }) => {
  await fixture(page)
  await page.route("**/api/promise-records?**", route => route.fulfill({ json: { records: [] } }))
  await page.goto("/company/northstar-tech")
  await expect(page.getByRole("navigation", { name: "主导航" }).getByRole("link", { name: "社区", exact: true })).toHaveAttribute("aria-current", "page")
  await expect(page.getByRole("navigation", { name: "面包屑" }).getByRole("link", { name: "社区", exact: true })).toHaveAttribute("href", "/community")
  const sections = page.getByRole("navigation", { name: "公司信息导航" })
  await expect(sections.getByRole("link", { name: "评分", exact: true })).toHaveAttribute("href", "/company/northstar-tech/ratings")
  await expect(sections.getByRole("link", { name: "评价", exact: true })).toHaveAttribute("href", "/company/northstar-tech/reviews")
  await sections.getByRole("link", { name: "论坛", exact: true }).click()
  await expect(page.getByTestId("forum-hub")).toBeVisible()
  await expect(page.getByRole("navigation", { name: "社区板块" })).toHaveCount(0)
  await expect(sections.getByRole("link", { name: "论坛", exact: true })).toHaveAttribute("aria-current", "page")
})

test("malformed discussion responses have retry feedback, not a blank homepage", async ({ page }) => {
  await fixture(page)
  let invalid = true
  await page.route("**/api/forum/posts?**", route => route.fulfill({ json: invalid ? { unexpected: [] } : { posts, nextCursor: null } }))
  await page.goto("/")
  await expect(page.getByRole("main").getByRole("alert")).toContainText("论坛暂时无法加载")
  await expect(page.getByRole("heading", { name: "还没有公开帖子" })).toHaveCount(0)
  invalid = false
  await page.getByRole("button", { name: "重试论坛" }).click()
  await expect(page.getByTestId("forum-post")).toHaveCount(3)
})
