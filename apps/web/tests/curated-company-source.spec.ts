import { expect, test } from "@playwright/test"
import { curatedCompanyFacts, getCompanyFactSource, getCuratedCompany, publicCompanyFactSource } from "../src/lib/curated-companies"
import { publicCompanyWebsite } from "../src/lib/company-identity"

test("original researched identities retain official sources without employee scores", () => {
  for (const fact of curatedCompanyFacts) {
    const source = getCompanyFactSource(fact.id, fact.name)
    expect(publicCompanyWebsite(source)).not.toBeNull()
    expect(getCompanyFactSource(fact.id, "另一家公司")).toBeNull()
    expect(getCuratedCompany(fact.id)).toMatchObject({ reviewCount: 0, directionScore: 0, highlights: [], riskTags: [] })
  }
  expect(getCompanyFactSource("unknown", "腾讯")).toBeNull()
})

test("identity sidebar keeps PR6 source links without changing company data", () => {
  const company = getCuratedCompany("10000000-0000-4000-8000-000000000021")!
  const snapshot = JSON.stringify(company)
  expect(publicCompanyFactSource(company)).toBe("https://careers.dji.com/zh-CN/about")
  expect(JSON.stringify(company)).toBe(snapshot)
  expect(publicCompanyFactSource({ ...company, name: "另一家公司", website: "javascript:alert(1)" })).toBeNull()
  expect(publicCompanyFactSource({ ...company, name: "另一家公司", website: "https://example.org" })).toBe("https://example.org/")
})
