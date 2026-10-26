import { defineConfig, devices } from "@playwright/test"

// A loopback-only visual fixture server. Never reuse a developer/production DB.
export default defineConfig({
  testDir: "./tests",
  testMatch: ["uiux-v1.spec.ts", "copy-interactions.spec.ts", "navigation-performance.spec.ts"],
  timeout: 60_000,
  workers: 1,
  outputDir: "./test-results/uiux-v1",
  reporter: "line",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3108",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3108",
    url: "http://127.0.0.1:3108/api/health/live",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: "", DATABASE_ADAPTER: "pg", AUTH_SECRET: "uiux-fixture-only-not-a-production-secret",
      CRON_SECRET: "", RESEND_API_KEY: "", MAIL_PROVIDER: "disabled",
      NEXT_PUBLIC_APP_ENV: "development", NEXT_PUBLIC_API_ENABLED: "true", NEXT_PUBLIC_PULSE_ENABLED: "true",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3108", NEXT_PUBLIC_ICP_FILING_NUMBER: "",
      ALLOW_DEV_AUTH: "true", INVITE_REQUIRED: "true", LAUNCH_SCOPE_ONLY: "true",
    },
  },
})
