import assert from "node:assert/strict"
import test from "node:test"

import {
  buildIndexDocument,
  freshnessWeight,
  normalizeEvidence,
  scoreSignals,
} from "./research-index-v3-core.mjs"

const target = { name: "测试公司", city: "上海", industry: "互联网" }

test("freshness uses the configured half-life and caps unknown dates", () => {
  assert.equal(freshnessWeight("2026-01-01", "2026-06-30", 180), 0.5)
  assert.equal(freshnessWeight(undefined, "2026-06-30", 180), 0.45)
})

test("same URL and excerpt are deduplicated before scoring", () => {
  const observation = {
    companyName: target.name,
    platform: "weibo",
    access: "ok",
    finalUrl: "https://weibo.com/post/1?utm_source=test",
    title: "测试公司双休",
    visibleText: "测试公司实行全员双休，周末不加班，团队福利清晰，员工体验稳定。".repeat(8),
    collectedAt: "2026-06-30T00:00:00.000Z",
  }
  const signals = normalizeEvidence({
    targets: [target],
    observations: [observation, { ...observation, query: "重复转载", finalUrl: "https://example.com/repost/1" }],
    dataAsOf: "2026-06-30",
  })
  assert.equal(signals.filter((signal) => signal.indexKey === "weekend").length, 1)
  const scored = scoreSignals(signals.filter((signal) => signal.indexKey === "weekend"), { dataAsOf: "2026-06-30" })
  assert.ok(scored.sourceCount <= 1)
})

test("opposing signals produce a bounded score and a conflict limitation", () => {
  const scored = scoreSignals([
    {
      companyName: target.name,
      indexKey: "weekend",
      effect: 1,
      sourceKind: "official",
      sourceType: "official_careers",
      sourceWeight: 1,
      freshnessWeight: 1,
      relevanceWeight: 1,
      trustWeight: 1,
      clusterKey: "official-1",
      id: "a",
      title: "官方双休",
    },
    {
      companyName: target.name,
      indexKey: "weekend",
      effect: -1,
      sourceKind: "platform_detail",
      sourceType: "zhihu",
      sourceWeight: 0.6,
      freshnessWeight: 1,
      relevanceWeight: 1,
      trustWeight: 1,
      clusterKey: "employee-1",
      id: "b",
      title: "员工周末加班",
    },
  ])
  assert.ok(scored.score >= 0 && scored.score <= 100)
  assert.ok(scored.limitations.some((item) => item.includes("方向相反")))
})

test("no evidence stays neutral with zero confidence", () => {
  const document = buildIndexDocument({ targets: [target], dataAsOf: "2026-06-30" })
  const company = document.companies[0]
  assert.equal(company.overallScore, null)
  assert.equal(company.confidence, 0)
  assert.equal(company.funIndices.canteen.score, 50)
  assert.equal(company.funIndices.canteen.confidence, 0)
})

test("department slices require independent evidence and shrink toward company score", () => {
  const document = buildIndexDocument({
    targets: [target],
    internalReviews: [
      { companyName: target.name, status: "visible", departmentName: "研发", city: "上海", content: "研发体验记录一", questionnaire: { workLifeBalanceScore: 9 }, createdAt: "2026-06-01" },
      { companyName: target.name, status: "visible", departmentName: "研发", city: "上海", content: "研发体验记录二", questionnaire: { workLifeBalanceScore: 8 }, createdAt: "2026-06-02" },
      { companyName: target.name, status: "visible", departmentName: "研发", city: "上海", content: "研发体验记录三", questionnaire: { workLifeBalanceScore: 9 }, createdAt: "2026-06-03" },
    ],
    dataAsOf: "2026-06-30",
  })
  const slices = document.companies[0].slices.filter((slice) => slice.scopeType === "department" && slice.scopeKey === "研发")
  assert.ok(slices.length > 0)
  assert.ok(slices.every((slice) => slice.effectiveSampleSize >= 3 && slice.sourceCount >= 2))
  assert.ok(slices[0].limitations.some((item) => item.includes("分层收缩")))
})
