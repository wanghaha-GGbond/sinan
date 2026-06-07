import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    // Browser binary resolution order:
    //   1. PLAYWRIGHT_CHROMIUM_PATH (explicit override, e.g. CI)
    //   2. The bundled chromium that ships with @playwright/test
    //      (downloaded by `npx playwright install chromium`)
    //   3. Whatever the system has at /usr/bin/chromium-browser or
    //      the platform default (fallback only — Linux-specific)
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
})
