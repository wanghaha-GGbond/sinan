import { test, expect } from "@playwright/test"

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
      expect(route.request().postDataJSON()).toEqual({ energy: 10, pressure: 1, workMinutes: 480 })
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
