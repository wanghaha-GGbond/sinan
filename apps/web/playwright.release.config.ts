import { defineConfig, devices } from "@playwright/test"

const releaseBaseURL = process.env.RELEASE_BASE_URL?.trim() || "http://127.0.0.1:3000"

export default defineConfig({
  testDir: "./tests/release",
  testMatch: "core-api-flow.spec.ts",
  timeout: 60_000,
  workers: 1,
  reporter: "line",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: releaseBaseURL,
  },
  ...(process.env.RELEASE_BASE_URL
    ? {}
    : {
        webServer: {
          command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
          url: "http://127.0.0.1:3000/api/health/live",
          reuseExistingServer: false,
          timeout: 120_000,
        },
      }),
})
