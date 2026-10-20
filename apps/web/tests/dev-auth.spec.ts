import { expect, test } from "@playwright/test"

import { isDevAuthEnabled } from "../src/lib/server/dev-auth"

test("development identities require an explicit opt-in", () => {
  expect(isDevAuthEnabled({ NODE_ENV: "development" })).toBe(false)
  expect(isDevAuthEnabled({ NODE_ENV: "development", ALLOW_DEV_AUTH: "true" })).toBe(true)
})

test("development identities fail closed in every deployed environment", () => {
  for (const env of [
    { NODE_ENV: "production" },
    { VERCEL_ENV: "production" },
    { NEXT_PUBLIC_APP_ENV: "production" },
    { NEXT_PUBLIC_APP_ENV: "staging" },
  ]) {
    expect(isDevAuthEnabled({ ...env, ALLOW_DEV_AUTH: "true" })).toBe(false)
  }
})

test("development identities are disabled when a database is configured", () => {
  expect(
    isDevAuthEnabled({
      NODE_ENV: "development",
      ALLOW_DEV_AUTH: "true",
      DATABASE_URL: "postgres://configured",
    }),
  ).toBe(false)
})
