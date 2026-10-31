import { expect, test } from "@playwright/test"

import {
  companyIndices,
  mergeCompanyIndices,
  type CompanyIndex,
} from "../src/lib/research-report"

test("published research overrides matching companies without dropping static reports", () => {
  const original = companyIndices[0]!
  const published: CompanyIndex = {
    ...original,
    overallScore: 99,
    confidence: 88,
  }

  const merged = mergeCompanyIndices([published])

  expect(merged).toHaveLength(companyIndices.length)
  expect(merged.find((index) => index.name === original.name)?.overallScore).toBe(99)
  expect(merged.some((index) => index.name === companyIndices[1]!.name)).toBe(true)
})

test("published-only companies are appended to the research overview", () => {
  const publishedOnly: CompanyIndex = {
    ...companyIndices[0]!,
    name: "新增公司",
  }

  const merged = mergeCompanyIndices([publishedOnly])

  expect(merged).toHaveLength(companyIndices.length + 1)
  expect(merged.at(-1)?.name).toBe("新增公司")
})
