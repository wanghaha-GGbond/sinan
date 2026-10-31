import { expect, test } from "@playwright/test"

import {
  generateInviteCode,
  INITIAL_QUOTA,
  isInviteRequired,
  MAX_QUOTA,
  RETURN_QUOTA_AT_TRUST,
  TRUST_LEVEL_TO_EARN_INVITES,
} from "../src/lib/server/invites"

test("invite codes use eight unambiguous uppercase characters", () => {
  const codes = Array.from({ length: 200 }, generateInviteCode)

  for (const code of codes) {
    expect(code).toMatch(/^[2-9A-HJ-KM-NP-Z]{8}$/)
    expect(code).not.toMatch(/[01OIL]/)
  }
  expect(new Set(codes).size).toBe(codes.length)
})

test("invite-only flag accepts only explicit enabled values", () => {
  expect(isInviteRequired("true")).toBe(true)
  expect(isInviteRequired(" TRUE ")).toBe(true)
  expect(isInviteRequired("1")).toBe(true)
  expect(isInviteRequired("false")).toBe(false)
  expect(isInviteRequired("0")).toBe(false)
  expect(isInviteRequired(undefined)).toBe(false)
})

test("invite quota constants preserve the launch policy", () => {
  expect(INITIAL_QUOTA).toBe(3)
  expect(MAX_QUOTA).toBe(6)
  expect(TRUST_LEVEL_TO_EARN_INVITES).toBe(1)
  expect(RETURN_QUOTA_AT_TRUST).toBe(2)
})
