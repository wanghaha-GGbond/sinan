import { test, expect } from "@playwright/test"

for (const theme of ["light", "dark"]) {
  test(`Pulse company switching preserves privacy gaps and fits mobile in ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 850 })
    await page.addInitScript(theme => localStorage.setItem("theme", theme), theme)
    await page.route("**/api/auth/me", route => route.fulfill({ json: { user: { id: "pulse-ui", role: "user" } } }))
    const summary = { days: 0, score: null, workMinutes: null, energyScore: null, calmScore: null, averageEndMinute: null, latestEndMinute: null }
    await page.route("**/api/me/pulse", route => route.fulfill({ json: { today: "2026-11-04", records: [], summary, week: summary, month: summary, eligibleCompanies: [] } }))
    await page.route("**/api/companies/search**", route => route.fulfill({ json: { companies: [{ id: "first", name: "样本不足公司" }, { id: "second", name: "已达阈值公司" }] } }))
    let failing = true
    await page.route("**/api/companies/*/pulse", route => {
      const second = route.request().url().includes("/second/")
      if (second && failing) return route.fulfill({ status: 503, json: { error: "unavailable" } })
      return route.fulfill({ json: { company: { id: second ? "second" : "first" }, from: "2026-10-21", through: "2026-11-03", minimumParticipants: 30, points: second ? [{ day: "2026-11-01", score: 75, participants: "30–49" }, { day: "2026-11-03", score: 80, participants: "30–49" }] : [] } })
    })
    await page.goto("/pulse")
    await expect(page.getByText("样本积累中")).toBeVisible()
    await page.getByLabel("查看公司").selectOption("second")
    const panel = page.getByTestId("company-pulse-panel")
    await expect(panel.getByRole("alert")).toContainText("公司趋势暂时无法加载")
    await expect(panel.getByText("样本积累中")).toHaveCount(0)
    failing = false
    await panel.getByRole("button", { name: "重试" }).click()
    const chart = panel.getByRole("img")
    await expect(chart).toBeVisible()
    await expect(chart.locator("circle")).toHaveCount(2)
    expect(await chart.locator("path").getAttribute("d")).not.toContain("L")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`pulse-${theme}-375.png`), fullPage: true })
  })
}

test("Pulse consent is opt-in and deleting records requires confirmation", async ({ page }) => {
  await page.route("**/api/auth/me", route => route.fulfill({ json: { user: { id: "pulse-consent", role: "user" } } }))
  await page.route("**/api/companies/search**", route => route.fulfill({ json: { companies: [] } }))
  const summary = { days: 0, score: null, workMinutes: null, energyScore: null, calmScore: null, averageEndMinute: null, latestEndMinute: null }
  let deletes = 0
  const payloads: Record<string, unknown>[] = []
  await page.route("**/api/me/pulse", route => {
    const method = route.request().method()
    if (method === "DELETE") { expect(route.request().postDataJSON()).toEqual({ confirmation: "DELETE_MY_PULSE" }); deletes++; return route.fulfill({ json: { success: true } }) }
    if (method === "POST") { payloads.push(route.request().postDataJSON()); return route.fulfill({ json: { record: {} } }) }
    return route.fulfill({ json: { today: "2026-11-04", records: [], summary, week: summary, month: summary, eligibleCompanies: [{ id: "verified-company", name: "已认证公司一" }] } })
  })
  await page.goto("/pulse")
  await page.getByLabel("下班时还有多少精力？").selectOption("8")
  await page.getByLabel("今天的工作压力？").selectOption("2")
  await page.getByRole("combobox", { name: "已认证公司", exact: true }).selectOption("verified-company")
  const consent = page.getByRole("checkbox", { name: /同意将今天/ })
  await expect(consent).not.toBeChecked()
  await page.getByRole("button", { name: "保存今天" }).click()
  await expect(page.getByText("今天的记录已保存")).toBeVisible()
  expect(payloads[0]).toMatchObject({ companyId: null, shareWithCompany: false })
  await consent.check()
  await page.getByLabel("下班时间（选填）").fill("23:30")
  await page.getByRole("button", { name: "保存今天" }).click()
  await expect.poll(() => payloads.length).toBe(2)
  expect(payloads[1]).toMatchObject({ companyId: "verified-company", shareWithCompany: true, endMinute: 1410 })
  await page.getByRole("button", { name: "清除个人记录与统计授权" }).click()
  expect(deletes).toBe(0)
  await page.getByRole("button", { name: "取消", exact: true }).click()
  expect(deletes).toBe(0)
  await page.getByRole("button", { name: "清除个人记录与统计授权" }).click()
  await page.getByRole("button", { name: "确认清除全部记录" }).click()
  await expect(page.getByText("个人记录已清除，不再参与公司统计", { exact: true })).toBeVisible()
  expect(deletes).toBe(1)
})

test("Pulse requires login instead of showing invented weekly statistics", async ({ page }) => {
  await page.route("**/api/auth/me", route => route.fulfill({ json: { user: null } }))
  await page.goto("/pulse")
  await expect(page.getByRole("link", { name: "登录后记录今天" })).toBeVisible()
  await expect(page.getByText("47.5h")).toHaveCount(0)
  await expect(page.getByText("示例：42 人匿名样本")).toHaveCount(0)
})

test("Pulse saves real form values, displays failures and reloads server records", async ({ page }) => {
  await page.route("**/api/auth/me", route => route.fulfill({ json: { user: { id: "fixture-user", role: "user" } } }))
  let saved = false
  let fail = true
  await page.route("**/api/me/pulse", async route => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toEqual({ energy: 10, pressure: 1, workMinutes: 480, endMinute: null, companyId: null, shareWithCompany: false })
      if (fail) return route.fulfill({ status: 503, json: { error: "保存失败，请重试" } })
      saved = true
      return route.fulfill({ json: { record: { day: "2026-11-03", energy: 10, pressure: 1, workMinutes: 480 } } })
    }
    return route.fulfill({ json: { today: "2026-11-03", records: saved ? [{ day: "2026-11-03", energy: 10, pressure: 1, workMinutes: 480 }] : [], summary: { days: saved ? 1 : 0, score: saved ? 100 : null, workMinutes: saved ? 480 : null } } })
  })
  await page.goto("/pulse")
  await expect(page.getByRole("button", { name: "保存今天" })).toBeDisabled()
  await page.getByLabel("下班时还有多少精力？").selectOption("10")
  await page.getByLabel("今天的工作压力？").selectOption("1")
  await page.getByLabel("工作时长（小时，选填）").fill("8")
  await page.getByRole("button", { name: "保存今天" }).click()
  await expect(page.getByText("保存失败，请重试")).toBeVisible()
  await expect(page.getByText("今天的记录已保存")).toHaveCount(0)
  fail = false
  await page.getByRole("button", { name: "保存今天" }).click()
  await expect(page.getByText("今天的记录已保存")).toBeVisible()
  await page.reload()
  await expect(page.getByText("1 天记录 · 已记录工时 8.0h")).toBeVisible()
})
