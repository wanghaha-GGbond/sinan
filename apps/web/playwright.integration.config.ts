import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/integration",
  testMatch: ["database-concurrency.spec.ts", "password-recovery.integration.spec.ts", "registration-codes.integration.spec.ts", "readiness.integration.spec.ts", "community-feed.integration.spec.ts"],
  timeout: 30_000,
  workers: 1,
  outputDir: "./test-results/integration",
  reporter: "line",
})
