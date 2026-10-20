import { expect, test } from "@playwright/test"

import { getSafeNextPath, withNext } from "../src/lib/navigation"

test("post-auth navigation accepts only same-origin app paths", () => {
  expect(getSafeNextPath("/submit/review?companyId=abc#score")).toBe(
    "/submit/review?companyId=abc#score",
  )
  expect(getSafeNextPath("https://evil.example/phish")).toBe("/")
  expect(getSafeNextPath("//evil.example/phish")).toBe("/")
  expect(getSafeNextPath("javascript:alert(1)")).toBe("/")
})

test("auth links preserve a safe destination", () => {
  expect(withNext("/login", "/me")).toBe("/login?next=%2Fme")
  expect(withNext("/register", "//evil.example")).toBe("/register?next=%2F")
})
