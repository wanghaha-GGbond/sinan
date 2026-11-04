import { expect, test } from "@playwright/test"
import { ratingDraftScore, ratingReviewHref } from "../src/lib/rating-navigation"

test("rating draft accepts zero and ten without converting invalid input to a score", () => {
  for (const value of ["0", "7", "8.5", "10", "10.0"]) expect(ratingDraftScore(value)).toBe(Number(value))
  for (const value of [null, "", "-1", "11", "NaN", "8garbage", "Infinity", "0x9", "10.1"]) expect(ratingDraftScore(value)).toBeNull()
})

test("rating navigation preserves company and draft score, never fabricates a submission", () => {
  const target = new URL(ratingReviewHref("company&test", 0), "https://example.test")
  expect(target.pathname).toBe("/submit/review")
  expect(target.searchParams.get("companyId")).toBe("company&test")
  expect(target.searchParams.get("directionScore")).toBe("0")
  for (const value of [-1, 11, NaN, Infinity]) expect(() => ratingReviewHref("company", value)).toThrow()
})
