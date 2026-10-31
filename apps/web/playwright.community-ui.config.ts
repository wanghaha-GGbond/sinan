import { defineConfig } from "@playwright/test"
import uiux from "./playwright.uiux.config"

// Separate loopback fixture: only this test server exposes the deferred demo.
const server = uiux.webServer as Exclude<typeof uiux.webServer, unknown[] | undefined>
export default defineConfig({
  ...uiux,
  testMatch: "community-ui.spec.ts",
  outputDir: "./test-results/community-ui",
  use: { ...uiux.use, baseURL: "http://127.0.0.1:3109" },
  webServer: {
    ...server,
    command: "npm run dev -- --hostname 127.0.0.1 --port 3109",
    url: "http://127.0.0.1:3109/api/health/live",
    env: { ...server.env, NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3109", LAUNCH_SCOPE_ONLY: "false" },
  },
})
