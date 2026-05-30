import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

test("首页显示司南品牌和搜索入口，且不出现工友", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "司南 推荐" })).toBeVisible()
  await expect(page.getByTestId("home-search-link")).toBeVisible()
  await expect(page.getByText("工友")).toHaveCount(0)
})

test("首页推荐卡显示公司体感标签并可进入公司页", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByTestId("recommend-direction-score").first()).toBeVisible()
  await expect(page.getByTestId("recommend-vibe-tag").first()).toBeVisible()
  await expect(page.getByText("公司体感：仓鼠笼公司")).toBeVisible()
  await expect(page.getByTestId("recommend-office-experience").first()).toBeVisible()
  await expect(page.getByText("C-BTI：")).toHaveCount(0)
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

test("/search 无结果时可进入添加公司流程", async ({ page }) => {
  await page.goto("/search")
  const companyName = `zzzz-search-${Date.now()}`
  await page.getByPlaceholder("搜索公司").fill(companyName)
  await expect(page.getByText("没有找到这家公司")).toBeVisible()
  await page.getByRole("link", { name: "添加公司" }).click()
  await expect(page).toHaveURL(/\/submit\/review\?mode=add-company/)
  await expect(page.getByTestId("new-company-name-input")).toHaveValue(companyName)
  await expect(page.getByRole("heading", { name: "添加未收录公司" })).toBeVisible()
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
  await expect(page.getByTestId("company-vibe-tag")).toBeVisible()
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

test("发布评价支持提交未收录公司注册信息并进入待审核状态", async ({ page }) => {
  await page.goto("/submit/review")
  const companyName = "司南自动化测试公司甲"
  await page.getByTestId("company-search-input").fill(companyName)
  await expect(page.getByTestId("company-search-input")).toHaveValue(companyName)
  await page.getByLabel("岗位 *").fill("前端工程师")
  await expect(page.getByTestId("no-company-result-card")).toBeVisible()
  await page.getByTestId("add-company-button").click()
  await expect(page.getByText("添加未收录公司")).toBeVisible()
  await expect(page.getByText("统一社会信用代码 *")).toBeVisible()
  await expect(page.getByText("注册地址 *")).toBeVisible()
  await expect(page.getByText("法定代表人 *")).toBeVisible()
  await expect(page.getByText("注册城市 *")).toBeVisible()
  await expect(page.getByText("所属行业 *")).toBeVisible()
  await page.getByTestId("new-company-credit-code-input").fill("91310000TEST000001")
  await page.getByTestId("new-company-address-input").fill("上海市浦东新区测试路 1 号")
  await page.getByTestId("new-company-legal-representative-input").fill("测试代表")
  await page.getByTestId("new-company-city-input").fill("上海")
  await page.getByTestId("new-company-industry-input").fill("AI")
  await page.getByTestId("save-company-and-continue-button").click()
  await expect(page.getByTestId("company-pending-review-card")).toBeVisible()
  await expect(page.getByText("公司信息已提交审核")).toBeVisible()
  await expect(page.getByTestId("company-pending-review-card").getByText("当前状态：待审核")).toBeVisible()
  await expect(page.getByTestId("company-step-next-button")).toBeDisabled()
  await expect(page.getByText("企业入驻")).toHaveCount(0)
  await expect(page.getByText("企业认证")).toHaveCount(0)
  await expect(page.getByText("企业认领")).toHaveCount(0)
})

test("添加公司模式只展示注册信息流程并校验统一社会信用代码", async ({ page }) => {
  await page.goto("/submit/review?mode=add-company&name=司南测试公司")
  await expect(page.getByText("补充办公体验问卷")).toHaveCount(0)
  await expect(page.getByTestId("submit-review-button")).toHaveCount(0)
  await expect(page.getByTestId("new-company-name-input")).toHaveValue("司南测试公司")
  await page.getByTestId("new-company-credit-code-input").fill("123")
  await page.getByTestId("new-company-address-input").fill("上海市浦东新区测试路 2 号")
  await page.getByTestId("new-company-legal-representative-input").fill("测试代表")
  await page.getByTestId("new-company-city-input").fill("上海")
  await page.getByTestId("new-company-industry-input").fill("AI")
  await page.getByTestId("save-company-and-continue-button").click()
  await expect(page.getByRole("main").getByText("请输入 18 位统一社会信用代码。")).toBeVisible()
})

test("添加公司会拦截攻击性公司名和敏感内容", async ({ page }) => {
  await page.goto("/submit/review?mode=add-company&name=垃圾公司")
  await page.getByTestId("new-company-credit-code-input").fill("91310000TEST000002")
  await page.getByTestId("new-company-address-input").fill("上海市浦东新区测试路 3 号")
  await page.getByTestId("new-company-legal-representative-input").fill("测试代表")
  await page.getByTestId("new-company-city-input").fill("上海")
  await page.getByTestId("new-company-industry-input").fill("AI")
  await page.getByTestId("save-company-and-continue-button").click()
  await expect(page.getByRole("main").getByText("公司名称包含不适合公开展示的表达，请改为正式注册名称。")).toBeVisible()
})

test("添加公司时提示疑似重复公司并可选择已有公司", async ({ page }) => {
  await page.goto("/submit/review?mode=add-company&name=北辰智造科技")
  await expect(page.getByTestId("similar-company-warning")).toBeVisible()
  await expect(page.getByText("可能已经收录这些公司")).toBeVisible()
  await page.getByTestId("similar-company-warning").getByRole("button", { name: "选择这家公司" }).first().click()
  await expect(page).toHaveURL("/submit/review")
  await expect(page.getByTestId("selected-company-pill")).toContainText("北辰智造科技")
  await expect(page.getByTestId("company-step-next-button")).toBeEnabled()
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

test("有用按钮仍可用且不会跳转", async ({ page }) => {
  await page.goto("/company/northstar-tech")
  const likeButton = page.getByTestId("like-review-review-1").first()
  await expect(likeButton).toBeVisible()
  await likeButton.click()
  await expect(page).toHaveURL(/\/company\/northstar-tech$/)
})

test("评价详情页显示追问与补充", async ({ page }) => {
  await page.goto("/company/northstar-tech/reviews/review-1")
  await expect(page.getByRole("heading", { name: "追问与补充" })).toBeVisible()
  await expect(page.getByTestId("discussion-type-question").first()).toBeVisible()
  await expect(page.getByTestId("discussion-type-supplement").first()).toBeVisible()
  await expect(page.getByTestId("public-discussion-list")).toContainText("[手机号已隐藏]")
  await expect(page.getByTestId("public-discussion-list")).not.toContainText("13812345678")
  await expect(page.getByTestId("public-discussion-list")).not.toContainText("这条非作者待审核内容不应该出现在公开列表")
  await expect(page.getByTestId("public-discussion-list")).not.toContainText("这条补充未通过审核")
  await expect(page.getByText("工友")).toHaveCount(0)
})

test("追问与补充高赞排序使用权重", async ({ page }) => {
  await page.goto("/company/northstar-tech/reviews/review-1")
  await page.getByTestId("discussion-sort-useful").click()
  await expect(page.getByTestId("public-discussion-list").getByTestId("discussion-card").first()).toContainText(
    "高赞排序应该优先看到这类真实补充"
  )
  await expect(page.getByTestId("public-discussion-list")).not.toContainText("审核中，仅你可见")
  await expect(page.getByTestId("public-discussion-list")).not.toContainText("未通过审核")
})

test("追问与补充最新排序稳定", async ({ page }) => {
  await page.goto("/company/northstar-tech/reviews/review-1")
  await page.getByTestId("discussion-sort-latest").click()
  await expect(page.getByTestId("public-discussion-list").getByTestId("discussion-card").first()).toContainText(
    "最近一周还有人面过这个岗位吗"
  )
})

test("追问与补充草稿刷新后可恢复", async ({ page }) => {
  await page.goto("/company/northstar-tech/reviews/review-1")
  const draft = "想问下刷新以后草稿还在不在"
  await page.getByTestId("discussion-content-input").fill(draft)
  await expect(page.getByText("已自动保存草稿")).toBeVisible()
  await page.reload()
  await expect(page.getByTestId("discussion-content-input")).toHaveValue(draft)
})

test("追问与补充发布后清除草稿", async ({ page }) => {
  await page.goto("/company/northstar-tech/reviews/review-1")
  const content = "发布以后这段草稿不应该再恢复"
  await page.getByTestId("discussion-content-input").fill(content)
  await expect(page.getByText("已自动保存草稿")).toBeVisible()
  await page.getByTestId("discussion-submit-button").click()
  await expect(page.getByText(content)).toBeVisible()
  await expect(page.getByTestId("discussion-content-input")).toHaveValue("")
  await page.reload()
  await expect(page.getByTestId("discussion-content-input")).toHaveValue("")
})

test("评价详情页可以发布追问", async ({ page }) => {
  await page.goto("/company/northstar-tech/reviews/review-1")
  const content = "这个加班是整个公司都有，还是某些团队？"
  await page.getByTestId("discussion-composer-question").click()
  await page.getByTestId("discussion-content-input").fill(content)
  await page.getByTestId("discussion-submit-button").click()
  await expect(page.getByText(content)).toBeVisible()
})

test("评价详情页可以发布补充", async ({ page }) => {
  await page.goto("/company/northstar-tech/reviews/review-1")
  const content = "我补充一下，不同团队差异比较大，新项目会更忙。"
  await page.getByTestId("discussion-composer-supplement").click()
  await page.getByTestId("discussion-content-input").fill(content)
  await page.getByTestId("discussion-submit-button").click()
  await expect(page.getByText(content)).toBeVisible()
})

test("追问与补充有用按钮可切换", async ({ page }) => {
  await page.goto("/company/northstar-tech/reviews/review-1")
  const button = page.getByTestId("discussion-useful-button").first()
  const initialCount = Number(await button.getAttribute("data-count"))
  await button.click()
  await expect(button).toHaveAttribute("aria-pressed", "true")
  await expect(button).toHaveAttribute("data-count", String(initialCount + 1))
  await button.click()
  await expect(button).toHaveAttribute("aria-pressed", "false")
  await expect(button).toHaveAttribute("data-count", String(initialCount))
})

test("追问与补充内容长度不足会被拦截", async ({ page }) => {
  await page.goto("/company/northstar-tech/reviews/review-1")
  await page.getByTestId("discussion-content-input").fill("太短")
  await page.getByTestId("discussion-submit-button").click()
  await expect(page.getByTestId("discussion-error")).toContainText("内容至少需要 5 个字")
})

test("追问与补充会拦截敏感内容", async ({ page }) => {
  await page.goto("/company/northstar-tech/reviews/review-1")
  await page.getByTestId("discussion-content-input").fill("可以联系我 13800138000 细聊")
  await page.getByTestId("discussion-submit-button").click()
  await expect(page.getByTestId("discussion-error")).toContainText("内容包含不适合公开展示的信息")
})

test("本地发布的补充会显示保存状态", async ({ page }) => {
  await page.goto("/company/northstar-tech/reviews/review-1")
  const content = "我补充一个本地保存状态，新项目组和老业务线节奏差异很明显。"
  await page.getByTestId("discussion-composer-supplement").click()
  await page.getByTestId("discussion-content-input").fill(content)
  await page.getByTestId("discussion-submit-button").click()
  await expect(page.getByTestId("my-discussion-status-list")).toContainText(content)
  await expect(page.getByTestId("my-discussion-status-list")).toContainText("本地已保存")
  await expect(page.getByTestId("public-discussion-list")).not.toContainText(content)
})

test("作者可见审核中和未通过状态，非公开内容不可点有用", async ({ page }) => {
  await page.goto("/company/northstar-tech/reviews/review-1")
  await expect(page.getByTestId("my-discussion-status-list")).toContainText("审核中，仅你可见")
  await expect(page.getByTestId("my-discussion-status-list")).toContainText("未通过审核")
  await expect(page.getByTestId("my-discussion-status-list").getByTestId("discussion-useful-button")).toHaveCount(0)
})

test("移动端首页/搜索/榜单/公司/详情无水平溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const route of ["/", "/search", "/rankings", "/company/northstar-tech", "/company/northstar-tech/reviews/review-1"]) {
    await page.goto(route)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  }
})
