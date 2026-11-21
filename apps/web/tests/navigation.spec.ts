import { expect, test } from "@playwright/test"

import { getSafeNextPath, withNext } from "../src/lib/navigation"
import { isPersonalArea, mainNavigation } from "../src/lib/app-navigation"
import { isResearchPath, researchIsInternal } from "../src/lib/research-visibility"

test("three primary destinations group check-ins under my and scoring under companies", () => {
  for (const path of ["/me", "/me/skills", "/settings/account", "/pulse"]) {
    expect(isPersonalArea(path)).toBe(true)
    const links = mainNavigation(path)
    expect(links.map(link => link.href)).toEqual(["/community", "/companies", "/me"])
    expect(links.filter(link => link.active).map(link => link.href)).toEqual(["/me"])
  }
  expect(mainNavigation("/company/abc/community").filter(link => link.active).map(link => link.href)).toEqual(["/community"])
  expect(mainNavigation("/company/abc/ratings").filter(link => link.active).map(link => link.href)).toEqual(["/companies"])
  expect(isPersonalArea("/researcher")).toBe(false)
  expect(isPersonalArea("/research")).toBe(false)
  expect(mainNavigation("/submit/review").filter(link => link.active).map(link => link.href)).toEqual(["/companies"])
})

test("research routes are internal and do not match unrelated paths", () => {
  expect(researchIsInternal()).toBe(true)
  for (const path of ["/research", "/research/bytedance", "/api/research", "/api/research/bytedance"]) expect(isResearchPath(path)).toBe(true)
  for (const path of ["/researcher", "/api/researcher", "/company/research"]) expect(isResearchPath(path)).toBe(false)
})

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
