import { expect, test } from "@playwright/test"

import { inferPublicCBTI } from "../src/lib/server/company-cbti"

function rows(count: number) {
  return Array.from({ length: count }, () => ({
    directionScore: 8,
    questionnaire: {
      workLifeBalanceScore: 7,
      growthScore: 8,
      managementClarityScore: 7,
      collaborationScore: 8,
      companyPace: "fast",
      managementStyle: "process_clear",
      growthExperience: "very_fast",
      collaborationStyle: "cross_team",
    },
  }))
}

test("CBTI stays hidden until the k-anonymous sample threshold is met", () => {
  expect(inferPublicCBTI(rows(4))).toBeUndefined()
  expect(inferPublicCBTI(rows(5))).toMatchObject({
    code: "RPGC",
    generatedBy: "derived",
  })
})

test("CBTI does not infer a profile from empty questionnaires", () => {
  expect(
    inferPublicCBTI(
      Array.from({ length: 5 }, () => ({ directionScore: 8, questionnaire: null }))
    )
  ).toBeUndefined()

  expect(
    inferPublicCBTI(
      Array.from({ length: 5 }, () => ({ directionScore: 8, questionnaire: {} }))
    )
  ).toBeUndefined()
})
