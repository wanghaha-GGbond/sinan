import { expect, test } from "@playwright/test"

import { inferPublicCBTI } from "../src/lib/server/company-cbti"
import { summarizeCompanyDimensions } from "../src/lib/server/company-dimensions"
import { buildQuestionnaireSession } from "../src/lib/questionnaire/question-bank"

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

test("CBTI stays hidden until the structured-answer sample threshold is met", () => {
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

test("each CBTI axis needs five answers, with no default profile or tied-axis inference", () => {
  expect(inferPublicCBTI(Array.from({ length: 5 }, () => ({ directionScore: 8, questionnaire: { companyPace: "fast" } })))).toBeUndefined()
  const sparse = rows(5)
  sparse[0].questionnaire.collaborationStyle = ""
  Object.assign(sparse[0].questionnaire, { collaborationScore: undefined })
  expect(inferPublicCBTI(sparse)).toBeUndefined()
  const tied = rows(6)
  for (let i = 0; i < 3; i++) tied[i].questionnaire.companyPace = "stable"
  expect(inferPublicCBTI(tied)).toBeUndefined()
})

test("dimension aggregates preserve zero and exclude missing, private and malformed data", () => {
  const result = summarizeCompanyDimensions([
    { questionnaire: { salaryScore: 0, growthScore: 8, content: "private" } },
    { questionnaire: { salaryScore: "10", growthScore: "", collaborationScore: false } },
    { questionnaire: { salaryScore: 99, growthScore: null } },
    { questionnaire: null },
  ])
  expect(result.find(item => item.key === "salaryScore")).toEqual({ key: "salaryScore", score: 5, count: 2 })
  expect(result.find(item => item.key === "growthScore")).toEqual({ key: "growthScore", score: 8, count: 1 })
  expect(result.find(item => item.key === "collaborationScore")).toEqual({ key: "collaborationScore", score: null, count: 0 })
  expect(JSON.stringify(result)).not.toContain("private")
})

test("default questionnaire includes all four CBTI axes and eight office questions", () => {
  const session = buildQuestionnaireSession()
  expect(session.questions).toHaveLength(12)
  for (const field of ["companyPace", "managementStyle", "growthExperience", "collaborationStyle"]) expect(session.questions.some(question => question.field === field)).toBe(true)
})
