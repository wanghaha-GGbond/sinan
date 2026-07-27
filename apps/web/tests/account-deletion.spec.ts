import { expect, test } from "@playwright/test"

import {
  ACCOUNT_DELETION_CONFIRMATION,
  buildDeletedUserValues,
} from "../src/lib/server/account-deletion"

test("account deletion requires an explicit confirmation phrase", () => {
  expect(ACCOUNT_DELETION_CONFIRMATION).toBe("DELETE")
})

test("account deletion removes direct identifiers and profile fields", () => {
  const deletedAt = new Date("2026-07-04T00:00:00.000Z")
  const values = buildDeletedUserValues("12345678-abcd-4000-8000-123456789abc", deletedAt)

  expect(values).toMatchObject({
    email: null,
    phone: null,
    passwordHash: null,
    avatarUrl: null,
    status: "deleted",
    jobBand: null,
    yearsOfExperience: null,
    highlightMoment: null,
    declinedOffer: null,
    profileFieldsStatus: null,
    deletedAt,
    updatedAt: deletedAt,
  })
  expect(values.displayName).toBe("已注销用户-12345678")
})
