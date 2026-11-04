import { expect, test } from "@playwright/test"
import { filterAndSortCompanies } from "../src/lib/company-directory"

const company = (id: string, reviewCount: number, score: number, createdAt = "2026-10-01") => ({
  id, name: id, shortName: null, englishName: "North Star", aliases: ["北星"], city: "杭州", industry: "科技", createdAt,
  reviewCount, directionScore: score, recommendationRate: score * 10,
})
const filters = { query: "", city: "全部", sort: "reviews" as const, ratedOnly: false }

test("directory never ranks nonexistent scores over real zero scores or mutates cached data", () => {
  const companies = [company("empty", 0, 10), company("rated", 1, 0)]
  for (const sort of ["score", "recommendation"] as const) expect(filterAndSortCompanies(companies, { ...filters, sort }).map(c => c.id)).toEqual(["rated", "empty"])
  expect(companies.map(c => c.id)).toEqual(["empty", "rated"])
  expect(filterAndSortCompanies(companies, { ...filters, ratedOnly: true }).map(c => c.id)).toEqual(["rated"])
})

test("directory absorbs PR5 recency and filters while preserving deterministic ties", () => {
  const companies = [company("b", 0, 0, "invalid"), company("a", 0, 0, "2026-10-31")]
  expect(filterAndSortCompanies(companies, { ...filters, sort: "recent" }).map(c => c.id)).toEqual(["a", "b"])
  expect(filterAndSortCompanies(companies, filters).map(c => c.id)).toEqual(["a", "b"])
  for (const query of [" north STAR ", "北星"]) expect(filterAndSortCompanies(companies, { ...filters, query })).toHaveLength(2)
  expect(filterAndSortCompanies(companies, { ...filters, city: "北京" })).toEqual([])
})
