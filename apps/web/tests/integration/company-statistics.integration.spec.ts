import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { NextRequest } from "next/server"
import { expect, test } from "../database-fixture"
import { db } from "../../src/db/client"
import { companies } from "../../src/db/schema/companies"
import { reviews } from "../../src/db/schema/reviews"
import { GET } from "../../src/app/api/companies/search/route"
import { GET as detail } from "../../src/app/api/companies/[id]/route"
import { getPublicCompanyDetail } from "../../src/lib/server/public-company-data"
import { POST as submitCompany } from "../../src/app/api/companies/community-submissions/route"
import { users } from "../../src/db/schema/users"
import { signToken } from "../../src/lib/server/auth"

let companyId = ""
test.afterEach(async () => {
  if (!companyId) return
  await db.delete(reviews).where(eq(reviews.companyId, companyId))
  await db.delete(companies).where(eq(companies.id, companyId))
  companyId = ""
})

test("real company submissions persist owner and pending status without exposing owner identity", async () => {
  const [owner] = await db.insert(users).values({ email: `${randomUUID()}@company-test.invalid`, displayName: "隔离测试" }).returning()
  let createdId = ""
  try {
    const token = await signToken({ userId: owner.id, role: "user" })
    const response = await submitCompany(new NextRequest("https://example.test/api/companies/community-submissions", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ registeredName: "隔离公司提交测试", unifiedSocialCreditCode: randomUUID().replaceAll("-", "").slice(0, 18).toUpperCase(), registeredAddress: "杭州市测试园区", legalRepresentative: "测试代表", city: "杭州", industry: "软件" }),
    }))
    expect(response.status).toBe(201)
    const result = (await response.json()).company
    createdId = result.id
    expect(result.reviewStatus).toBe("pending_review")
    expect(result).not.toHaveProperty("submittedByUserId")
    const [saved] = await db.select().from(companies).where(eq(companies.id, createdId))
    expect(saved.submittedByUserId).toBe(owner.id)
    expect(await getPublicCompanyDetail(createdId)).toBeNull()
  } finally {
    if (createdId) await db.delete(companies).where(eq(companies.id, createdId))
    await db.delete(users).where(eq(users.id, owner.id))
  }
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
  const questionnaire = { salaryScore: 0, growthScore: 8, collaborationScore: 8, managementClarityScore: 8, workLifeBalanceScore: 8 }
  await db.update(reviews).set({ questionnaire: { salaryScore: 10 } }).where(eq(reviews.companyId, companyId))
  // Only the five public records contribute, regardless of private rows.
  const { inArray, and, isNull } = await import("drizzle-orm")
  await db.update(reviews).set({ questionnaire }).where(and(eq(reviews.companyId, companyId), inArray(reviews.status, ["visible", "limited_visible"]), isNull(reviews.deletedAt)))
  const structured = (await (await request()).json()).companies[0]
  expect(structured.cbti).toMatchObject({ generatedBy: "derived" })
  const responseDetail = await detail(new NextRequest(`https://example.test/api/companies/${companyId}`), { params: Promise.resolve({ id: companyId }) })
  expect(responseDetail.status).toBe(200)
  const publicDetail = (await responseDetail.json()).company
  expect(publicDetail).toEqual(await getPublicCompanyDetail(companyId))
  expect(publicDetail.dimensionSummary).toContainEqual({ key: "salaryScore", score: 0, count: 5 })
  expect(publicDetail.dimensionSummary).toContainEqual({ key: "stabilityScore", score: null, count: 0 })
  expect(JSON.stringify(publicDetail)).not.toContain("PRIVATE_REVIEW_TEXT")
  await db.update(companies).set({ reviewStatus: "rejected" }).where(eq(companies.id, companyId))
  expect((await (await request()).json()).companies).toEqual([])
})
