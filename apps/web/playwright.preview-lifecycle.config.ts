import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  testMatch: "preview-request-lifecycle.spec.ts",
  timeout: 15_000,
  workers: 1,
  reporter: "line",
  outputDir: "./test-results/preview-lifecycle",
  use: {
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
})
