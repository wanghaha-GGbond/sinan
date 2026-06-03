import { expect, test } from "@playwright/test"

async function stabilizePage(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
    `,
  })
  await page.evaluate(async () => {
    // Keep screenshots deterministic when fonts load asynchronously.
    if ("fonts" in document) {
      await document.fonts.ready
    }
  })
  await page.waitForTimeout(100)
}

test.describe("visual regression desktop", () => {
  test.use({ viewport: { width: 1440, height: 1000 } })

  const pages = [
    { route: "/", snapshot: "home-desktop.png" },
    { route: "/search", snapshot: "search-desktop.png" },
    { route: "/rankings", snapshot: "rankings-desktop.png" },
    { route: "/company/northstar-tech", snapshot: "company-desktop.png" },
    { route: "/company/northstar-tech/reviews/review-1", snapshot: "review-detail-desktop.png" },
  ]

  for (const item of pages) {
    test(`snapshot ${item.route}`, async ({ page }) => {
      await page.goto(item.route, { waitUntil: "networkidle" })
      await stabilizePage(page)
      await expect(page).toHaveScreenshot(item.snapshot, { fullPage: true, animations: "disabled" })
    })
  }
})

test.describe("visual regression mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  const pages = [
    { route: "/", snapshot: "home-mobile.png" },
    { route: "/search", snapshot: "search-mobile.png" },
    { route: "/company/northstar-tech", snapshot: "company-mobile.png" },
    { route: "/company/northstar-tech/reviews/review-1", snapshot: "review-detail-mobile.png" },
  ]

  for (const item of pages) {
    test(`snapshot ${item.route}`, async ({ page }) => {
      await page.goto(item.route, { waitUntil: "networkidle" })
      await stabilizePage(page)
      await expect(page).toHaveScreenshot(item.snapshot, { fullPage: true, animations: "disabled" })
    })
  }
})
