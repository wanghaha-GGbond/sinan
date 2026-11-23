import { defineConfig, devices } from "@playwright/test"

const releaseBaseURL = process.env.RELEASE_BASE_URL?.trim() || "http://127.0.0.1:3000"

export default defineConfig({
  testDir: "./tests/release",
  testMatch: ["points.release.spec.ts", "dialogue.release.spec.ts", "forum.release.spec.ts", "core-api-flow.spec.ts", "password-recovery.release.spec.ts", "owner-registration.mail.spec.ts"],
  timeout: 60_000,
  workers: 1,
  outputDir: "./test-results/release",
  reporter: "line",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: releaseBaseURL,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  ...(process.env.RELEASE_BASE_URL
    ? {}
    : {
        webServer: {
          // Test the actual production bundle. Dev HMR can reload repeatedly
          // while a new company route is compiling, hiding real interactions.
          command: "npm run build && npm run start -- --hostname 127.0.0.1 --port 3000",
          url: "http://127.0.0.1:3000/api/health/live",
          reuseExistingServer: false,
          timeout: 240_000,
          env: { NEXT_PUBLIC_APP_ENV: "staging", NEXT_PUBLIC_API_ENABLED: "true", NEXT_PUBLIC_PULSE_ENABLED: "true", NEXT_PUBLIC_DIALOGUE_ENABLED: "true", DIALOGUE_ENABLED: "true", NEXT_PUBLIC_POINTS_ENABLED: "true", POINTS_ENABLED: "true" },
        },
      }),
})
