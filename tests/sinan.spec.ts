import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

test("首页显示司南品牌和搜索入口，且不出现工友", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "司南 推荐" })).toBeVisible()
  await expect(page.getByTestId("home-search-link")).toBeVisible()
  await expect(page.getByText("工友")).toHaveCount(0)
})

test("首页推荐卡简化显示方向分/评价数/C-BTI，并可进入公司页", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByTestId("recommend-direction-score").first()).toBeVisible()
  await expect(page.getByTestId("recommend-cbti-tag").first()).toBeVisible()
  await expect(page.getByTestId("recommend-office-experience").first()).toBeVisible()
  await expect(page.getByText("适合：")).toHaveCount(0)
  await expect(page.getByText("慎重：")).toHaveCount(0)
  await expect(page.getByText("匿名评价者 · L")).toHaveCount(0)
  await page.getByText("看这家公司").first().click()
  await expect(page).toHaveURL(/\/company\//)
})

test("/search 正常渲染，卡片可进入公司页，且不出现工友", async ({ page }) => {
  await page.goto("/search")
  await expect(page.locator("main").getByRole("heading", { name: "搜索公司" })).toBeVisible()
  await expect(page.getByText("工友")).toHaveCount(0)
  await page.locator('a[href^="/company/"]').first().click()
  await expect(page).toHaveURL(/\/company\//)
})

test("/rankings 正常渲染，榜单项可进入公司页，且不出现工友", async ({ page }) => {
  await page.goto("/rankings")
  await expect(page.getByRole("heading", { name: "公司发现" })).toBeVisible()
  await expect(page.getByText("工友")).toHaveCount(0)
  await page.getByRole("link", { name: /看这家公司/ }).first().click()
  await expect(page).toHaveURL(/\/company\//)
})

test("公司页评论流仍正常且不出现工友", async ({ page }) => {
  await page.goto("/company/northstar-tech")
  await expect(page.getByTestId("company-review-feed")).toBeVisible()
  await expect(page.getByTestId("company-cbti")).toBeVisible()
  await expect(page.getByTestId("company-office-experience")).toBeVisible()
  await expect(page.getByTestId("direction-score-sidebar")).toHaveCount(0)
  await expect(page.getByText(/匿名评价者 · L\d ·/)).toHaveCount(25)
  await expect(page.getByText("工友")).toHaveCount(0)
})

test("问卷可完成并返回发布页", async ({ page }) => {
  await page.goto("/submit/review")
  await expect(page.getByTestId("optional-questionnaire")).toBeVisible()
  await expect(page.getByTestId("questionnaire-open-flag")).toHaveText("closed")
  await page.getByTestId("start-questionnaire-button").click()
  await expect(page).toHaveURL(/questionnaire=1/)
  await expect(page.getByTestId("questionnaire-open-flag")).toHaveText("open")
  await expect(page.getByTestId("fullscreen-questionnaire")).toBeVisible()
  await expect(page.getByTestId("question-progress")).toBeVisible()
  await expect(page.getByTestId("question-card")).toBeVisible()
  await expect(page.getByTestId("question-card").getByText("补充办公体验问卷")).toBeVisible()
  for (let i = 0; i < 24; i += 1) {
    if (await page.getByTestId("questionnaire-complete-card").isVisible()) break
    await page.getByTestId("skip-question-button").click({ force: true })
    await page.waitForTimeout(260)
  }
  await expect(page.getByTestId("questionnaire-complete-card")).toBeVisible()
  await expect(page.getByTestId("questionnaire-complete-card").getByText("方向值 +8")).toBeVisible()
  await page.getByTestId("questionnaire-complete-return-button").click()
  await expect(page).toHaveURL("/submit/review")
  await expect(page.getByTestId("company-step-next-button")).toBeVisible()
})

async function fillAndSubmitReview(page: Page, opts?: { skipQuestionnaire?: boolean; companyName?: string }) {
  async function ensureSafetyChecked() {
    const checkbox = page.getByTestId("anonymous-safety-checkbox")
    const className = (await checkbox.getAttribute("class")) ?? ""
    if (!className.includes("border-primary")) {
      await checkbox.click()
    }
  }

  if (opts?.companyName) {
    await page.getByTestId("company-search-input").fill(opts.companyName)
    await page.getByTestId("company-result-option").first().click()
    await expect(page.getByTestId("selected-company-pill")).toBeVisible()
  }
  if (await page.getByTestId("company-step-next-button").isVisible()) {
    await page.getByTestId("company-step-next-button").click()
  }
  await expect(page.getByText("方向分")).toBeVisible()
  await page.getByTestId("review-next").click()
  await expect(page.getByTestId("review-title-input")).toBeVisible()
  await page.getByTestId("review-title-input").fill("节奏快但项目密度高，适合成长")
  await page.getByTestId("review-content-input").fill("团队目标很明确，反馈周期快，协作成本可控，但项目节奏较快，需要较强自驱和沟通能力。")
  await ensureSafetyChecked()
  if (!opts?.skipQuestionnaire) {
    await page.getByTestId("start-questionnaire-button").click()
    await expect(page).toHaveURL(/questionnaire=1/)
    for (let index = 0; index < 2; index += 1) {
      await page.getByTestId("questionnaire-option-button").first().click()
    }
    await page.getByRole("button", { name: "关闭" }).click()
    await expect(page).toHaveURL("/submit/review")
    if (await page.getByLabel("岗位 *").isVisible()) {
      await page.getByLabel("岗位 *").fill("算法工程师")
    }
    if (opts?.companyName && await page.getByTestId("company-search-input").isVisible()) {
      await page.getByTestId("company-search-input").fill(opts.companyName)
      await page.getByTestId("company-result-option").first().click()
    }
    for (let i = 0; i < 4; i += 1) {
      if (await page.getByTestId("review-title-input").isVisible()) break
      if (await page.getByTestId("company-step-next-button").isVisible()) {
        await page.getByTestId("company-step-next-button").click()
        continue
      }
      if (await page.getByTestId("review-next").isVisible()) {
        await page.getByTestId("review-next").click()
      }
    }
    await page.getByTestId("review-title-input").fill("节奏快但项目密度高，适合成长")
    await page.getByTestId("review-content-input").fill("团队目标很明确，反馈周期快，协作成本可控，但项目节奏较快，需要较强自驱和沟通能力。")
    await ensureSafetyChecked()
  }
  for (let i = 0; i < 3; i += 1) {
    if (await page.getByTestId("submit-review-button").isVisible()) break
    if (await page.getByTestId("review-next").isVisible()) {
      await page.getByTestId("review-next").click()
      continue
    }
    if (await page.getByTestId("company-step-next-button").isVisible()) {
      await page.getByTestId("company-step-next-button").click()
      continue
    }
  }
  await expect(page.getByTestId("submit-review-button")).toBeVisible()
  await page.getByTestId("submit-review-button").click()
  await expect(page.getByTestId("submit-review-success")).toBeVisible()
}

test("发布评价支持新增未收录公司并继续评价后提交成功（无问卷）", async ({ page }) => {
  await page.goto("/submit/review")
  const companyName = `zzzz-company-${Date.now()}`
  await page.getByTestId("company-search-input").fill(companyName)
  await expect(page.getByTestId("company-search-input")).toHaveValue(companyName)
  await page.getByLabel("岗位 *").fill("前端工程师")
  await expect(page.getByTestId("no-company-result-card")).toBeVisible()
  await page.getByTestId("add-company-button").click()
  await page.getByTestId("new-company-city-input").fill("上海")
  await page.getByTestId("new-company-industry-input").fill("AI")
  await page.getByTestId("save-company-and-continue-button").click()
  await expect(page.getByText("方向分")).toBeVisible()
  await fillAndSubmitReview(page, { skipQuestionnaire: true })
})

test("发布评价：已有公司 + 问卷提交成功", async ({ page }) => {
  await page.goto("/submit/review")
  await page.getByLabel("岗位 *").fill("算法工程师")
  await fillAndSubmitReview(page, { companyName: "北辰智造科技" })
})

test("发布评价：已有公司 + 无问卷提交成功", async ({ page }) => {
  await page.goto("/submit/review")
  await page.getByLabel("岗位 *").fill("后端工程师")
  await fillAndSubmitReview(page, { skipQuestionnaire: true, companyName: "北辰智造科技" })
})

test("发布评价：新增公司 + 问卷提交成功", async ({ page }) => {
  await page.goto("/submit/review")
  const companyName = `zzzz-new-company-${Date.now()}`
  await page.getByTestId("company-search-input").fill(companyName)
  await expect(page.getByTestId("company-search-input")).toHaveValue(companyName)
  await page.getByLabel("岗位 *").fill("测试工程师")
  await expect(page.getByTestId("no-company-result-card")).toBeVisible()
  await page.getByTestId("add-company-button").click()
  await page.getByTestId("new-company-city-input").fill("深圳")
  await page.getByTestId("new-company-industry-input").fill("机器人")
  await page.getByTestId("save-company-and-continue-button").click()
  await expect(page.getByText("方向分")).toBeVisible()
  await fillAndSubmitReview(page)
})

test("有用按钮仍可用且不会跳转", async ({ page }) => {
  await page.goto("/company/northstar-tech")
  const likeButton = page.getByTestId("like-review-review-1").first()
  await expect(likeButton).toBeVisible()
  await likeButton.click()
  await expect(page).toHaveURL(/\/company\/northstar-tech$/)
})

test("详情页仍正常且不出现工友", async ({ page }) => {
  await page.goto("/company/northstar-tech/reviews/review-1")
  await expect(page.getByRole("heading", { name: "追问与补充" })).toBeVisible()
  await expect(page.getByText("工友")).toHaveCount(0)
})

test("移动端首页/搜索/榜单/公司/详情无水平溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const route of ["/", "/search", "/rankings", "/company/northstar-tech", "/company/northstar-tech/reviews/review-1"]) {
    await page.goto(route)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  }
})
