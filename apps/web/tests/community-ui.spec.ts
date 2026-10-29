import { expect, test } from "@playwright/test"

for (const width of [375, 1280]) {
  test(`PR6 community demo ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto("/community")
    await expect(page.getByRole("heading", { name: "社区", exact: true })).toBeVisible()
    await expect(page.getByText("以下为产品演示讨论，非实时用户发言")).toBeVisible()
    await expect(page.locator("article").first()).toBeVisible()
    await page.getByRole("button", { name: "追问", exact: true }).click()
    await expect(page.getByRole("button", { name: "追问", exact: true })).toHaveAttribute("aria-pressed", "true")
    for (const article of await page.locator("article").all()) await expect(article).toContainText("追问")
    await page.getByRole("button", { name: "全部", exact: true }).click()
    await page.getByRole("combobox", { name: "排序", exact: true }).selectOption("company")
    await expect(page.getByRole("combobox", { name: "排序", exact: true })).toHaveValue("company")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole("link", { name: "注册", exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`community-${width}.png`), fullPage: true })
  })
}
