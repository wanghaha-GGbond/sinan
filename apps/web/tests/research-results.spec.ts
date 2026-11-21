import { expect, test } from "@playwright/test"

for (const width of [390, 1280]) for (const theme of ["light", "dark"]) {
  test(`internal research is not a public product ${width}px ${theme}`, async ({ page }, info) => {
    await page.route("**/api/auth/me", route => route.fulfill({ json: { user: null } }))
    await page.setViewportSize({ width, height: 844 })
    await page.addInitScript(theme => localStorage.setItem("sinan:theme", theme), theme)
    for (const path of ["/research", "/research/bytedance", "/research/meituan"]) {
      const response = await page.goto(path)
      expect(response?.status()).toBe(404)
      await expect(page.getByRole("main")).toHaveCount(1)
      await expect(page.locator('a[href^="/research"]')).toHaveCount(0)
      await expect(page.getByTestId("research-results")).toHaveCount(0)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath("internal-research.png"), fullPage: true })
  })
}

test("public research APIs cannot reveal the internal database", async ({ request }) => {
  for (const path of ["/api/research", "/api/research/bytedance", "/api/research/meituan", "/api/research/private.json"]) {
    const response = await request.get(path)
    expect(response.status()).toBe(404)
    expect(response.headers()["cache-control"]).toContain("no-store")
    expect(await response.json()).toEqual({ error: "Not found" })
  }
})
