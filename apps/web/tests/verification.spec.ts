import { expect, test } from "@playwright/test"

import {
  codeExpiresAt,
  generateVerificationCode,
  grantedTrustLevel,
  hashCode,
  MAX_ATTEMPTS,
} from "../src/lib/server/verification"

test("verification codes are zero-padded six-digit values", () => {
  for (let index = 0; index < 200; index += 1) {
    expect(generateVerificationCode()).toMatch(/^\d{6}$/)
  }
})

test("verification codes are stored as deterministic SHA-256 hashes", () => {
  const code = "004219"
  const hash = hashCode(code)

  expect(hash).toMatch(/^[a-f0-9]{64}$/)
  expect(hash).toBe(hashCode(code))
  expect(hash).not.toContain(code)
  expect(hash).not.toBe(hashCode("004218"))
})

test("verification codes expire after fifteen minutes", () => {
  const before = Date.now()
  const expiry = codeExpiresAt().getTime()
  const after = Date.now()

  expect(expiry).toBeGreaterThanOrEqual(before + 15 * 60 * 1000)
  expect(expiry).toBeLessThanOrEqual(after + 15 * 60 * 1000)
  expect(MAX_ATTEMPTS).toBe(5)
})

test("proof types map to monotonic trust levels", () => {
  expect(grantedTrustLevel("work_email")).toBe(1)
  expect(grantedTrustLevel("business_document")).toBe(2)
  expect(grantedTrustLevel("salary_proof")).toBe(3)
  expect(grantedTrustLevel("unknown")).toBe(1)
})
