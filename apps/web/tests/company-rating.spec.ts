import { expect, test } from "@playwright/test"
import { companyDisplayScore } from "../src/components/company/company-rating"
import { companyRatingSampleCount } from "../src/lib/company-rating-samples"

test("V1 keeps scores on the API's ten-point scale", () => {
  expect(companyDisplayScore(8.6, 12)).toBe(8.6)
  expect(companyDisplayScore(0, 1)).toBe(0)
  expect(companyDisplayScore(10, 1)).toBe(10)
})

test("V1 never invents ratings for absent samples or invalid values", () => {
  expect(companyDisplayScore(8, 0)).toBeNull()
  expect(companyDisplayScore(8, -1)).toBeNull()
  for (const score of [undefined, null, NaN, Infinity, -1, 11]) {
    expect(companyDisplayScore(score, 1)).toBeNull()
  }
})

test("independent sample count overrides history while older API responses remain compatible", () => {
  expect(companyRatingSampleCount({ reviewCount: 8, ratingSampleCount: 0 })).toBe(0)
  expect(companyDisplayScore(0, companyRatingSampleCount({ reviewCount: 8, ratingSampleCount: 0 }))).toBeNull()
  expect(companyRatingSampleCount({ reviewCount: 8 })).toBe(8)
  expect(companyRatingSampleCount({})).toBe(0)
})
