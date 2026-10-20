import { test as base, expect } from "@playwright/test"
import { pool } from "../src/db/client"

// Test files in one worker share the lazy database module. Close its pool only
// when the worker finishes, not after the first file.
export const test = base.extend<object, { databaseLifecycle: void }>({
  databaseLifecycle: [async ({ playwright }, useFixture) => {
    void playwright
    try { await useFixture() } finally { await pool.end() }
  }, { scope: "worker", auto: true }],
})
export { expect }
