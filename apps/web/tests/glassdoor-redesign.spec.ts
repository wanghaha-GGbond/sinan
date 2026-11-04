import { expect, test } from "@playwright/test"

for (const width of [390, 1440]) {
  test(`company directory and community remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))

    await page.goto("/companies")
    const directory = page.getByTestId("company-directory")
    await expect(directory.getByTestId("company-directory-item").first()).toBeVisible()
    await expect(directory.getByTestId("company-directory-item").first()).toContainText("综合评分 / 10")
    await expect(directory.getByTestId("company-directory-item").first()).toContainText("条评价")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    // Preserve PR6's layout assertions, but exercise the real API contract.
    // Never require production to show the old hard-coded demo discussions.
    await page.route("**/api/community**", route => route.fulfill({ json: { discussions: [{
      id: "pr6-discussion", reviewId: "pr6-review", companyId: "northstar-tech", companyName: "北辰智造科技",
      type: "question", authorLabel: "匿名同事", content: "团队协作如何？", usefulCount: 1,
      tags: [], createdAt: "2026-11-01T00:00:00Z",
    }], limit: 50 } }))
    await page.goto("/community")
    await expect(page.getByText("以下为产品演示讨论，非实时用户发言")).toHaveCount(0)
    await expect(page.locator("article").first()).toBeVisible()
    await page.getByRole("button", { name: "追问" }).click()
    await expect(page.getByRole("button", { name: "追问" })).toHaveAttribute("aria-pressed", "true")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(errors).toEqual([])
  })
}
