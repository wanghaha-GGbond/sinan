import { expect, test } from "@playwright/test"

import {
  isReviewRejectionReason,
  reviewModerationTarget,
} from "../src/lib/server/review-moderation"

test("review moderation actions map to launch-safe states", () => {
  expect(reviewModerationTarget("approve")).toBe("visible")
  expect(reviewModerationTarget("reject")).toBe("rejected")
  expect(reviewModerationTarget("hide")).toBeNull()
})

test("review rejection reasons use the schema enum subset", () => {
  expect(isReviewRejectionReason("privacy")).toBe(true)
  expect(isReviewRejectionReason("personal_attack")).toBe(true)
  expect(isReviewRejectionReason("none")).toBe(false)
})
