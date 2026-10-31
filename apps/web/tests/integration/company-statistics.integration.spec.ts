import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { NextRequest } from "next/server"
import { expect, test } from "../database-fixture"
import { db } from "../../src/db/client"
import { companies } from "../../src/db/schema/companies"
import { reviews } from "../../src/db/schema/reviews"
import { GET } from "../../src/app/api/companies/search/route"

let companyId = ""
test.afterEach(async () => {
  if (!companyId) return
  await db.delete(reviews).where(eq(reviews.companyId, companyId))
  await db.delete(companies).where(eq(companies.id, companyId))
  companyId = ""
})

test("single-query catalog preserves public ratings, CBTI threshold and empty samples", async () => {
  const name = `Stats ${randomUUID()}`
  const [company] = await db.insert(companies).values({ name, city: "杭州", industry: "科技", reviewStatus: "reviewable" }).returning()
  companyId = company.id
  const request = () => GET(new NextRequest(`https://example.test/api/companies/search?q=${encodeURIComponent(name)}`))
  const empty = await request()
  expect(empty.status).toBe(200)
  expect((await empty.json()).companies[0]).toMatchObject({ reviewCount: 0, directionScore: 0, recommendationRate: 0 })
  const base = { companyId, authorLabel: "匿名同事", title: "隔离查询测试", content: "PRIVATE_REVIEW_TEXT", status: "visible" as const }
  await db.insert(reviews).values([
    ...[0, 2, 4, 8, 10].map((score, index) => ({ ...base, directionScore: String(score), recommendToJoin: index < 3, status: index === 0 ? "limited_visible" as const : "visible" as const })),
    { ...base, directionScore: "10", status: "pending_review" },
    { ...base, directionScore: "10", status: "hidden" },
    { ...base, directionScore: "10", deletedAt: new Date() },
  ])
  const response = await request()
  const result = (await response.json()).companies[0]
  expect(result).toMatchObject({ reviewCount: 5, directionScore: 4.8, recommendationRate: 60 })
  expect(result.cbti).toBeUndefined()
  expect(JSON.stringify(result)).not.toContain("PRIVATE_REVIEW_TEXT")
  expect(result).not.toHaveProperty("statistics")
  const questionnaire = { growthScore: 8, collaborationScore: 8, managementClarityScore: 8, workLifeBalanceScore: 8 }
  // Only the five public records contribute, regardless of private rows.
  const { inArray, and, isNull } = await import("drizzle-orm")
  await db.update(reviews).set({ questionnaire }).where(and(eq(reviews.companyId, companyId), inArray(reviews.status, ["visible", "limited_visible"]), isNull(reviews.deletedAt)))
  const structured = (await (await request()).json()).companies[0]
  expect(structured.cbti).toMatchObject({ generatedBy: "derived" })
  await db.update(companies).set({ reviewStatus: "rejected" }).where(eq(companies.id, companyId))
  expect((await (await request()).json()).companies).toEqual([])
})
