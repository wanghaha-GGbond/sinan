import { test, expect } from "@playwright/test"
import { readinessContract, verifyReadinessSchema } from "../src/lib/server/readiness-schema"

test("readiness fails when only connectivity works but migration is absent", async () => {
  await expect(verifyReadinessSchema(async () => ({ rows: [] }))).rejects.toThrow("Required migration is missing")
})
test("readiness validates auth tables even when the migration journal exists", async () => {
  let calls = 0
  await expect(verifyReadinessSchema(async () => {
    if (++calls === 1) return { rows: [{ id: 1 }] }
    throw new Error("missing column")
  })).rejects.toThrow("missing column")
  expect(calls).toBe(2)
})
test("ready schema exposes only release compatibility metadata", async () => {
  let calls = 0
  await verifyReadinessSchema(async () => ({ rows: ++calls === 1 ? [{ id: 1 }] : [] }))
  expect(calls).toBe(2)
  expect(readinessContract.authContract).toBe(2)
  expect(readinessContract.migration).toMatch(/^\d+_/)
})
