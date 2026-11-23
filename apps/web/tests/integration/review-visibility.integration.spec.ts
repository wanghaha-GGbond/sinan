import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { NextRequest } from "next/server"
import { test, expect } from "../database-fixture"
import { db } from "../../src/db/client"
import { companies } from "../../src/db/schema/companies"
import { reviews } from "../../src/db/schema/reviews"
import { findPublicReview } from "../../src/lib/server/public-review-query"
import { GET as list } from "../../src/app/api/reviews/route"
import { GET as detail } from "../../src/app/api/reviews/[reviewId]/route"
import { GET as discussions } from "../../src/app/api/reviews/[reviewId]/discussions/route"

test("nonpublic companies hide reviews from direct, global-list and discussion API paths", async () => {
  const [company] = await db.insert(companies).values({ name: `Visibility ${randomUUID()}`, city: "杭州", industry: "软件", reviewStatus: "reviewable" }).returning()
  try {
    const [review] = await db.insert(reviews).values({ companyId: company.id, authorLabel: "匿名同事", title: "父公司可见性测试", content: "隔离测试内容，不使用正式账号和生产数据。", directionScore: "8", status: "visible" }).returning()
    const request = (path: string) => new NextRequest(`https://example.test${path}`, { headers: { Authorization: "Bearer invalid-anonymous-fixture" } })
    const params = { params: Promise.resolve({ reviewId: review.id }) }
    expect(await findPublicReview(review.id)).not.toBeNull()
    expect((await detail(request(`/api/reviews/${review.id}`), params)).status).toBe(200)
    for (const patch of [{ reviewStatus: "rejected" as const }, { reviewStatus: "pending_review" as const }, { reviewStatus: "reviewable" as const, deletedAt: new Date() }]) {
      await db.update(companies).set(patch).where(eq(companies.id, company.id))
      expect(await findPublicReview(review.id)).toBeNull()
      expect((await detail(request(`/api/reviews/${review.id}`), params)).status).toBe(404)
      expect((await discussions(request(`/api/reviews/${review.id}/discussions`), params)).status).toBe(404)
      const response = await list(request(`/api/reviews?companyId=${company.id}`))
      expect(response.status).toBe(200)
      expect((await response.json()).reviews).toEqual([])
    }
  } finally {
    await db.delete(reviews).where(eq(reviews.companyId, company.id))
    await db.delete(companies).where(eq(companies.id, company.id))
  }
})
