import { defineConfig, devices } from "@playwright/test"

// Build first with npm run build:cf. All application API calls in these tests
// are intercepted; the server uses an empty DB URL so no live data is touched.
export default defineConfig({
  testDir: "./tests",
  testMatch: ["navigation-performance.spec.ts", "copy-interactions.spec.ts"],
  workers: 1,
  timeout: 30_000,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:3197",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3197",
    env: { DATABASE_URL: "", NEXT_PUBLIC_APP_ENV: "staging", LAUNCH_SCOPE_ONLY: "true" },
    url: "http://127.0.0.1:3197",
    reuseExistingServer: false,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
})
