import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/integration",
  testMatch: "database-concurrency.spec.ts",
  timeout: 30_000,
  workers: 1,
  reporter: "line",
})
