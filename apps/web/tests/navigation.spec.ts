import { expect, test } from "@playwright/test"

import { getSafeNextPath, withNext } from "../src/lib/navigation"
import { isPersonalArea, mainNavigation, personalNavigation } from "../src/lib/app-navigation"

test("primary navigation groups research and check-ins under my space without duplicate active links", () => {
  for (const path of ["/me", "/me/skills", "/settings/account", "/pulse", "/research", "/research/bytedance"]) {
    expect(isPersonalArea(path)).toBe(true)
    const links = mainNavigation(path)
    expect(links.map(link => link.href)).toEqual(["/companies", "/community", "/submit/review", "/me"])
    expect(links.filter(link => link.active).map(link => link.href)).toEqual(["/me"])
  }
  expect(mainNavigation("/company/abc/community").filter(link => link.active).map(link => link.href)).toEqual(["/community"])
  expect(mainNavigation("/company/abc/ratings").filter(link => link.active).map(link => link.href)).toEqual(["/companies"])
  expect(isPersonalArea("/researcher")).toBe(false)
})

test("personal navigation respects Pulse kill switch and keeps existing public research URLs", () => {
  expect(personalNavigation("/research/bytedance", false)).toEqual([
    { href: "/me", label: "概览", active: false },
    { href: "/research", label: "公司研究", active: true },
  ])
  expect(personalNavigation("/pulse", true).filter(link => link.active).map(link => link.href)).toEqual(["/pulse"])
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
