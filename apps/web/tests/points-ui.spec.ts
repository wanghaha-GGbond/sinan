import { expect, test, type Page } from "@playwright/test"
const id = "30000000-0000-4000-8000-000000000027", bidId = "40000000-0000-4000-8000-000000000027"
const session = { id, title: "隔离积分对话：聊聊跨团队协作", description: "本场仅为隔离页面测试中的样例，用于验证积分竞拍操作，不代表真实活动。", guestName: "隔离测试嘉宾", guestBio: "隔离样例嘉宾，仅用于检查页面布局与输入流程。", durationMinutes: 45, capacity: 1, startsAt: "2030-01-02T04:00:00Z", signupEndsAt: "2030-01-01T04:00:00Z", fundingMode: "undecided", status: "open", selectionMode: "points", minBidPoints: 1, pointsSettledAt: null, paymentsEnabled: false, biddingEnabled: false, pointsBiddingEnabled: true, donationStatus: "not_started", createdAt: "2026-11-23T00:00:00Z" }
const wallet = (available = 25, frozen = 0, claimed = true) => ({ available, frozen, verified: true, policy: { purchasable: false, transferable: false, redeemableForCash: false, donation: false }, tasks: [{ id: "verified_email", title: "完成邮箱注册", points: 20, claimed }, { id: "daily_visit", title: "今日来在场", points: 5, claimed: true }], entries: [] })
async function auth(page: Page) {
  await page.route("**/api/auth/me", route => route.fulfill({ json: { user: { id: "points-ui", role: "user" } } }))
  await page.route("**/api/companies/search**", route => route.fulfill({ json: { companies: [] } }))
}
for (const width of [320, 390, 1280]) for (const theme of ["light", "dark"]) {
  test(`points ticket is earned-only and usable ${width}px ${theme}`, async ({ page }, info) => {
    await auth(page); await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(value => localStorage.setItem("sinan:theme", value), theme)
    await page.route(`**/api/dialogues/${id}`, route => route.fulfill({ json: { session } }))
    await page.route(`**/api/dialogues/${id}/points-bids`, route => route.fulfill({ json: { application: null } }))
    await page.route("**/api/me/points", route => route.fulfill({ json: wallet() }))
    await page.goto(`/community/dialogues/${id}`)
    await expect(page.getByRole("heading", { name: "积分竞拍", exact: true })).toBeVisible()
    await expect(page.getByLabel("本次出价（积分）", { exact: true })).toHaveAttribute("max", "25")
    await expect(page.getByText(/不可充值、转让或提现/)).toBeVisible()
    await expect(page.getByRole("button", { name: /支付|充值|捐赠|提现/ })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath("points-bid.png"), fullPage: true })
    await page.getByRole("link", { name: "领取积分", exact: true }).click()
    await expect(page.getByTestId("points-available")).toHaveText("25")
    await expect(page.getByTestId("points-frozen")).toHaveText("0")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath("points-wallet.png"), fullPage: true })
  })
}
test("failed point bids preserve input and request identity; only a confirmed hold updates wallet", async ({ page }) => {
  await auth(page)
  let fail = true, held = false
  const requests: unknown[] = []
  const question = "希望了解跨团队项目中具体如何安排沟通和工作节奏？"
  await page.route(`**/api/dialogues/${id}`, route => route.fulfill({ json: { session } }))
  await page.route("**/api/me/points", route => route.fulfill({ json: wallet(held ? 15 : 25, held ? 10 : 0) }))
  await page.route(`**/api/dialogues/${id}/points-bids`, route => {
    const application = { id: bidId, sessionId: id, question, status: "submitted", bidPoints: 10, pointsState: "held" }
    if (route.request().method() === "GET") return route.fulfill({ json: { application: held ? application : null } })
    requests.push(route.request().postDataJSON())
    if (!fail) held = true
    return route.fulfill(fail ? { status: 503, json: { error: "积分暂时不可用" } } : { status: 201, json: { application } })
  })
  await page.goto(`/community/dialogues/${id}`)
  await page.getByLabel("本次出价（积分）", { exact: true }).fill("10")
  await page.getByLabel("想聊的问题", { exact: true }).fill(question)
  await page.getByRole("button", { name: "确认出价并冻结积分", exact: true }).click()
  await expect(page.getByRole("alert")).toHaveText("积分暂时不可用")
  await expect(page.getByLabel("想聊的问题", { exact: true })).toHaveValue(question)
  await expect(page.getByText(/出价已记录/)).toHaveCount(0)
  fail = false
  await page.getByRole("button", { name: "确认出价并冻结积分", exact: true }).click()
  await expect(page.getByText(/出价已记录，积分已冻结/)).toBeVisible()
  expect(requests).toHaveLength(2); expect(requests[0]).toEqual(requests[1])
  expect(Object.keys(requests[0] as object).sort()).toEqual(["points", "question", "requestId"])
})
test("wallet failure is not a fake zero balance; task reward needs a real successful response", async ({ page }) => {
  await auth(page); let available = 0, claimed = false, fail = true
  await page.route("**/api/me/points", route => route.fulfill(fail ? { status: 503, json: { error: "钱包不可用" } } : { json: wallet(available, 0, claimed) }))
  await page.route("**/api/me/points/claim", route => { available = 20; claimed = true; return route.fulfill({ json: { claimed: true, awarded: 20 } }) })
  await page.goto("/me/points")
  await expect(page.getByRole("alert")).toContainText("积分暂时无法加载")
  await expect(page.getByTestId("points-available")).toHaveCount(0)
  fail = false; await page.getByRole("button", { name: "重试", exact: true }).click()
  await page.getByRole("button", { name: "完成邮箱注册领取积分", exact: true }).click()
  await expect(page.getByTestId("points-available")).toHaveText("20")
  await expect(page.getByRole("button", { name: "完成邮箱注册已领取", exact: true })).toBeDisabled()
})
