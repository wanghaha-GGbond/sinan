import { expect, test } from "@playwright/test"

import { isPulseEnabled } from "../src/lib/pulse-feature"

test("Pulse is enabled for local development and staging", () => {
  expect(isPulseEnabled({ NEXT_PUBLIC_APP_ENV: "development" })).toBe(true)
  expect(isPulseEnabled({ NEXT_PUBLIC_APP_ENV: "staging", NEXT_PUBLIC_PULSE_ENABLED: "true" })).toBe(true)
})

test("Pulse is disabled in production unless explicitly enabled", () => {
  expect(isPulseEnabled({ NEXT_PUBLIC_APP_ENV: "production" })).toBe(false)
  expect(isPulseEnabled({ NEXT_PUBLIC_APP_ENV: "production", NEXT_PUBLIC_PULSE_ENABLED: "false" })).toBe(false)
})

test("Pulse can be explicitly disabled outside production", () => {
  expect(isPulseEnabled({ NEXT_PUBLIC_APP_ENV: "development", NEXT_PUBLIC_PULSE_ENABLED: "false" })).toBe(false)
})
