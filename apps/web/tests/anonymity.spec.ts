import { expect, test } from "@playwright/test"

import {
  anonymizeAuthorLabel,
  canExposeDepartment,
  publicDepartmentLabel,
} from "../src/lib/server/anonymity"

test("department visibility requires five verified authors", () => {
  expect(canExposeDepartment({ verifiedAuthorCount: 4 })).toBe(false)
  expect(publicDepartmentLabel("商业化", { verifiedAuthorCount: 4 })).toBeNull()

  expect(canExposeDepartment({ verifiedAuthorCount: 5 })).toBe(true)
  expect(publicDepartmentLabel("商业化", { verifiedAuthorCount: 5 })).toBe(
    "商业化"
  )
})

test("seniority labels are blurred below the department threshold", () => {
  expect(
    anonymizeAuthorLabel("某 L7 验证用户", { verifiedAuthorCount: 4 })
  ).toBe("某 高职级 验证用户")
  expect(
    anonymizeAuthorLabel("某 L7 验证用户", { verifiedAuthorCount: 5 })
  ).toBe("某 L7 验证用户")
})
