import { expect, test } from "@playwright/test"
import { researchDisplayScore, researchHeadline, researchSignals } from "../src/lib/research-presentation"
import type { CompanyCard, ScoreDetail } from "../src/lib/research-report"

import {
  companyIndices,
  mergeCompanyIndices,
  type CompanyIndex,
} from "../src/lib/research-report"

test("research presentation hides unsupported fallback scores but retains real zero", () => {
  const score: ScoreDetail = { score: 0, confidence: 60, evidenceCount: 2, reasons: [], limitations: [] }
  expect(researchDisplayScore(score)).toBe(0)
  expect(researchDisplayScore({ ...score, score: 50, evidenceCount: 0 })).toBeNull()
  expect(researchDisplayScore({ ...score, score: 50, confidence: 0 })).toBeNull()
  for (const invalid of [-1, 101, Number.NaN]) expect(researchDisplayScore({ ...score, score: invalid })).toBeNull()
})

test("research headlines use supported conclusions rather than internal collection copy", () => {
  const items = [
    { signal: "不可用线索", basis: "", sourceUrl: "", evidenceUsable: false },
    { signal: "", basis: "", sourceUrl: "", evidenceUsable: true },
    { signal: "已核实的方向", basis: "", sourceUrl: "", evidenceUsable: true },
  ]
  expect(researchSignals(items).map(item => item.signal)).toEqual(["已核实的方向"])
  const card = { opportunityDetails: items, departments: ["研发"], oneLine: "内部采集说明" } as CompanyCard
  expect(researchHeadline(card)).toBe("已核实的方向")
  expect(researchHeadline({ ...card, opportunityDetails: [] })).toBe("关注方向：研发")
  expect(researchHeadline()).toBe("暂无研究结论")
})

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
