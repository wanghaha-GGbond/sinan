import { defineConfig } from "@playwright/test"

// Run after test:uiux: reuse its opt-in build, then disable the runtime flag.
// This deliberately does not rebuild: a compiled public flag alone is unsafe.
export default defineConfig({
  testDir: "./tests",
  testMatch: "dialogue-runtime-gate.spec.ts",
  workers: 1,
  reporter: "line",
  outputDir: "./test-results/dialogue-gate",
  use: { baseURL: "http://127.0.0.1:3111" },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3111",
    url: "http://127.0.0.1:3111/api/health/live",
    reuseExistingServer: false,
    env: { DATABASE_URL: "", DATABASE_ADAPTER: "pg", AUTH_SECRET: "dialogue-gate-test-only-not-a-production-secret", MAIL_PROVIDER: "disabled", NEXT_PUBLIC_DIALOGUE_ENABLED: "false", NEXT_PUBLIC_APP_ENV: "development", LAUNCH_SCOPE_ONLY: "true" },
  },
})
