import { expect, test } from "@playwright/test"
import sources from "../src/data/company-logo-sources.json"

const companies = sources.map(source => ({ id: source.id, name: source.name, city: "北京", industry: "科技", reviewCount: 0, directionScore: null }))
for (const theme of ["light", "dark"]) for (const width of [390, 1280]) {
  test(`official logos render locally in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.addInitScript(theme => localStorage.setItem("sinan:theme", theme), theme)
    const externalImages: string[] = []
    page.on("request", request => {
      if (request.resourceType() === "image" && !request.url().startsWith("http://127.0.0.1:3108/")) externalImages.push(request.url())
    })
    await page.route("**/api/companies/search**", route => route.fulfill({ json: { companies } }))
    await page.goto("/companies")
    for (const source of sources) {
      const logo = page.getByRole("img", { name: `${source.name} Logo`, exact: true })
      await logo.scrollIntoViewIfNeeded()
      await expect(logo).toHaveAttribute("src", source.asset)
      await expect.poll(() => logo.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    }
    expect(externalImages).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`company-logos-${theme}-${width}.png`), fullPage: true })
  })
}

test("missing and unreviewed logos retain non-tracking fallback", async ({ page }) => {
  const source = sources[0]
  await page.route(`**${source.asset}`, route => route.fulfill({ status: 404, body: "missing" }))
  await page.route("**/api/companies/search**", route => route.fulfill({ json: { companies: [companies[0], { id: "unknown", name: "未知公司", logoUrl: "https://tracker.invalid/pixel", city: "北京", industry: "科技" }] } }))
  const requests: string[] = []
  page.on("request", request => requests.push(request.url()))
  await page.goto("/companies")
  await expect(page.getByRole("link", { name: new RegExp(`查看${source.name}`) }).getByTestId("company-logo")).toHaveText(Array.from(source.name)[0])
  await expect(page.getByRole("link", { name: /查看未知公司/ }).getByTestId("company-logo")).toHaveText("未")
  expect(requests.some(url => url.includes("tracker.invalid"))).toBe(false)
})
