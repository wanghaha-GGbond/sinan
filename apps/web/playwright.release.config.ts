import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/release",
  testMatch: "core-api-flow.spec.ts",
  timeout: 60_000,
  workers: 1,
  reporter: "line",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3000",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000/api/health/live",
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
