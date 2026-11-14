import { expect, test, type Page } from "@playwright/test"
const companyId = "10000000-0000-4000-8000-000000000001", postId = "20000000-0000-4000-8000-000000000001"
const post = { id: postId, companyId, companyName: "测试公司", category: "question", title: "团队协作怎样进行？", content: "希望了解跨团队协作与工作节奏的真实情况。", status: "visible", authorLabel: "匿名成员", isMine: false, usefulCount: 0, replyCount: 0, isUseful: false, createdAt: "2026-11-07T12:00:00Z" }
test("company switching preserves feed, topic and sorting", async ({ page }) => {
  await fixture(page, true)
  await page.goto("/community?feed=mine&category=interview&sort=useful")
  const directory = page.getByRole("complementary", { name: "公司论坛目录" })
  await expect(directory.getByRole("link", { name: "测试公司" })).toHaveAttribute("href", `/company/${companyId}/community?feed=mine&category=interview&sort=useful`)
  await expect(directory.getByRole("link", { name: "全部公司" })).toHaveAttribute("href", "/community?feed=mine&category=interview&sort=useful")
})
test("empty following feed provides company discovery instead of a dead end", async ({ page }) => {
  await fixture(page, true)
  await page.route("**/api/forum/posts?**", r => r.fulfill({ json: { posts: [], nextCursor: null } }))
  await page.goto("/community?feed=following")
  await expect(page.getByRole("heading", { name: "你还没有关注公司" })).toBeVisible()
  await expect(page.getByRole("link", { name: "发现公司论坛" })).toHaveAttribute("href", "/community")
})
test("clearing empty-result filters preserves my feed and sort", async ({ page }) => {
  await fixture(page, true)
  await page.route("**/api/forum/posts?**", r => r.fulfill({ json: { posts: [], nextCursor: null } }))
  await page.goto(`/community?feed=mine&category=interview&sort=useful&companyId=${companyId}`)
  await expect(page.getByRole("heading", { name: "没有符合筛选的帖子" })).toBeVisible()
  await page.getByRole("button", { name: "清除筛选" }).click()
  await expect(page).toHaveURL(url => url.searchParams.get("feed") === "mine" && url.searchParams.get("sort") === "useful" && !url.searchParams.has("category") && !url.searchParams.has("companyId"))
  await expect(page.getByRole("heading", { name: "你还没有发布帖子" })).toBeVisible()
})
async function fixture(page: Page, signedIn = false) {
  await page.route("**/api/auth/me", r => r.fulfill({ json: { user: signedIn ? { id: "forum-fixture", role: "user" } : null } }))
  await page.route("**/api/companies/search**", r => r.fulfill({ json: { companies: [{ id: companyId, name: "测试公司", industry: "软件", city: "上海", reviewCount: 0 }] } }))
  await page.route("**/api/forum/follows", r => r.fulfill({ json: { companyIds: [] } }))
  await page.route("**/api/forum/posts?**", r => r.fulfill({ json: { posts: [post], nextCursor: null } }))
  await page.route(`**/api/forum/posts/${postId}`, r => r.fulfill({ json: { post, replies: [], myReplies: [], nextCursor: null } }))
}
for (const width of [390, 1280]) for (const theme of ["light", "dark"]) test(`forum feed and thread fit ${width}px ${theme}`, async ({ page }, info) => {
  await fixture(page); await page.setViewportSize({ width, height: 900 }); await page.addInitScript(t => localStorage.setItem("sinan:theme", t), theme)
  await page.goto("/community")
  await expect(page.getByRole("heading", { name: "社区", exact: true })).toBeVisible()
  await expect(page.getByTestId("forum-post")).toHaveCount(1)
  await expect(page.getByRole("link", { name: "登录后发帖" })).toHaveAttribute("href", "/login?next=%2Fcommunity")
  await page.getByRole("button", { name: "面试交流", exact: true }).click()
  await expect(page).toHaveURL(url => url.searchParams.get("category") === "interview")
  await page.reload(); await expect(page.getByRole("button", { name: "面试交流", exact: true })).toHaveAttribute("aria-pressed", "true")
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath("forum-feed.png"), fullPage: true })
  await page.getByRole("heading", { name: post.title }).click()
  await expect(page.getByRole("heading", { name: post.title })).toBeVisible()
  await expect(page.getByRole("link", { name: "登录后回复" })).toHaveAttribute("href", `/login?next=${encodeURIComponent(`/community/${postId}`)}`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath("forum-thread.png"), fullPage: true })
})
test("forum API failure is not an empty success and retries", async ({ page }) => {
  await fixture(page); let fail = true
  await page.route("**/api/forum/posts?**", r => r.fulfill(fail ? { status: 503, json: { error: "offline" } } : { json: { posts: [], nextCursor: null } }))
  await page.goto("/community")
  await expect(page.getByRole("main").getByRole("alert")).toContainText("论坛暂时无法加载")
  await expect(page.getByText("还没有公开帖子", { exact: true })).toHaveCount(0)
  fail = false; await page.getByRole("button", { name: "重试论坛" }).click()
  await expect(page.getByText("还没有公开帖子", { exact: true })).toBeVisible()
})
test("post failures preserve fields and request id; success lands on own pending post", async ({ page }) => {
  await fixture(page, true); let fail = true
  const bodies: { requestId: string; companyId: string }[] = []
  await page.route("**/api/forum/posts", r => { bodies.push(r.request().postDataJSON()); return r.fulfill(fail ? { status: 503, json: { error: "提交暂时不可用" } } : { status: 201, json: { post: { id: postId, status: "pending_review" } } }) })
  await page.route(`**/api/forum/posts/${postId}`, r => r.fulfill({ json: { post: { ...post, status: "pending_review", isMine: true }, replies: [], myReplies: [], nextCursor: null } }))
  await page.goto(`/community?companyId=${companyId}`)
  await page.locator("#forum-composer summary").click()
  await expect(page.getByLabel("发帖公司")).toHaveValue(companyId)
  await page.getByLabel("标题", { exact: true }).fill(post.title); await page.getByLabel("正文", { exact: true }).fill(post.content)
  await page.getByRole("button", { name: "提交帖子" }).click()
  await expect(page.locator("form").getByRole("alert")).toContainText("提交暂时不可用")
  await expect(page.getByRole("textbox", { name: "正文", exact: true })).toHaveValue(post.content)
  fail = false; await page.getByRole("button", { name: "提交帖子" }).click()
  await expect(page).toHaveURL(new RegExp(`/community/${postId}$`))
  await expect(page.getByText("已提交，等待审核", { exact: false })).toBeVisible()
  expect(bodies).toHaveLength(2); expect(bodies[0].requestId).toBe(bodies[1].requestId)
})
test("reply error keeps content, success waits for moderation; no fabricated public reply", async ({ page }) => {
  await fixture(page, true); let fail = true
  await page.route(`**/api/forum/posts/${postId}/replies`, r => r.fulfill(fail ? { status: 503, json: { error: "回复暂时不可用" } } : { status: 201, json: { reply: { id: "reply-fixture", status: "pending_review" } } }))
  await page.goto(`/community/${postId}`); await page.getByLabel("写回复").fill("我的回复内容")
  await page.getByRole("button", { name: "提交回复" }).click(); await expect(page.locator("form").getByRole("alert")).toContainText("回复暂时不可用")
  await expect(page.getByLabel("写回复")).toHaveValue("我的回复内容")
  fail = false; await page.getByRole("button", { name: "提交回复" }).click()
  await expect(page.getByText("回复已提交", { exact: true })).toBeVisible(); await expect(page.getByText("还没有公开回复", { exact: true })).toBeVisible()
})
test("company detail keeps a reachable forum tab without replacing old rating tabs", async ({ page }) => {
  await fixture(page); await page.goto("/company/northstar-tech")
  const nav = page.getByRole("navigation", { name: "公司信息导航" })
  await expect(nav.getByRole("link")).toHaveCount(5)
  await nav.getByRole("link", { name: "论坛", exact: true }).click()
  await expect(nav.getByRole("link", { name: "论坛", exact: true })).toHaveAttribute("aria-current", "page")
  await expect(page.locator("h1")).toHaveCount(1)
})
test("forum pagination failure preserves cards and retry appends without duplicate rows", async ({ page }) => {
  await fixture(page); let fail = true
  await page.route("**/api/forum/posts?**", r => {
    if (!new URL(r.request().url()).searchParams.has("cursor")) return r.fulfill({ json: { posts: [post], nextCursor: "fixture-next" } })
    return r.fulfill(fail ? { status: 503, json: { error: "分页失败" } } : { json: { posts: [{ ...post, id: "20000000-0000-4000-8000-000000000002", title: "第二篇公开帖子" }], nextCursor: null } })
  })
  await page.goto("/community"); await page.getByRole("button", { name: "更多帖子" }).click()
  await expect(page.getByText("后续帖子加载失败，已加载内容保留。", { exact: true })).toBeVisible()
  await expect(page.getByTestId("forum-post")).toHaveCount(1)
  fail = false; await page.getByRole("button", { name: "重试更多帖子" }).click()
  await expect(page.getByTestId("forum-post")).toHaveCount(2)
})
test("follow and vote failures never show success; successful follow is persisted via API", async ({ page }) => {
  await fixture(page, true); let fail = true, followed = false
  await page.route("**/api/forum/follows", r => {
    if (r.request().method() === "GET") return r.fulfill({ json: { companyIds: followed ? [companyId] : [] } })
    if (fail) return r.fulfill({ status: 503, json: { error: "关注暂时不可用" } })
    followed = r.request().postDataJSON().following
    return r.fulfill({ json: { companyId, following: followed } })
  })
  await page.route(`**/api/forum/posts/${postId}/useful`, r => r.fulfill({ status: 503, json: { error: "点赞暂时不可用" } }))
  await page.goto(`/community?companyId=${companyId}`)
  await page.getByRole("button", { name: "关注公司", exact: true }).click()
  await expect(page.getByText("关注暂时不可用", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "已关注", exact: true })).toHaveCount(0)
  fail = false; await page.getByRole("button", { name: "关注公司", exact: true }).click()
  await expect(page.getByRole("button", { name: "已关注", exact: true })).toBeVisible()
  const vote = page.getByRole("button", { name: "赞同 · 0", exact: true }); await vote.click()
  await expect(page.getByText("点赞暂时不可用", { exact: true })).toBeVisible(); await expect(vote).toHaveAttribute("aria-pressed", "false")
})
