import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  testMatch: [
    "account-deletion.spec.ts",
    "anonymity.spec.ts",
    "auction-engine.spec.ts",
    "circles.spec.ts",
    "dev-auth.spec.ts",
    "dm-engine.spec.ts",
    "error-reporting.spec.ts",
    "invites.spec.ts",
    "launch-scope.spec.ts",
    "launch-scope-response.spec.ts",
    "navigation.spec.ts",
    "review-moderation.spec.ts",
    "review-data.spec.ts",
    "review-view.spec.ts",
    "verification.spec.ts",
  ],
  timeout: 10_000,
  workers: 1,
  reporter: "line",
})
