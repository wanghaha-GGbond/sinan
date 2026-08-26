import { randomUUID } from "node:crypto"

import { expect, test } from "@playwright/test"
import { eq, inArray } from "drizzle-orm"

import { db, pool } from "../../src/db/client"
import { anonymousProfiles } from "../../src/db/schema/anonymous-profiles"
import { companies } from "../../src/db/schema/companies"
import { invites } from "../../src/db/schema/invites"
import { moderationEvents } from "../../src/db/schema/moderation-events"
import { reviews } from "../../src/db/schema/reviews"
import { users } from "../../src/db/schema/users"
import { hashPassword, signToken } from "../../src/lib/server/auth"

let inviterId = ""
let moderatorId = ""
let companyId = ""
let registeredUserId = ""
let reviewId = ""
let inviteCode = ""
let moderatorToken = ""

test.beforeAll(async () => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10)
  inviteCode = `R${suffix.slice(0, 7)}`.toUpperCase()
  const passwordHash = await hashPassword("ReleaseTest123!")
  const createdUsers = await db.insert(users).values([
    { email: `inviter-${suffix}@integration.sinan.test`, displayName: "Release Inviter", passwordHash },
    { email: `moderator-${suffix}@integration.sinan.test`, displayName: "Release Moderator", passwordHash, role: "moderator" },
  ]).returning({ id: users.id, role: users.role })
  inviterId = createdUsers[0].id
  moderatorId = createdUsers[1].id
  moderatorToken = await signToken({ userId: moderatorId, role: "moderator" })

  await db.insert(invites).values({ code: inviteCode, inviterUserId: inviterId })
  const [company] = await db.insert(companies).values({
    name: `Release Company ${suffix}`,
    shortName: `Release ${suffix}`,
    city: "上海",
    industry: "软件服务",
    reviewStatus: "reviewable",
  }).returning({ id: companies.id })
  companyId = company.id
})

test.afterAll(async () => {
  if (reviewId) await db.delete(moderationEvents).where(eq(moderationEvents.entityId, reviewId))
  if (reviewId) await db.delete(reviews).where(eq(reviews.id, reviewId))
  if (registeredUserId) await db.delete(anonymousProfiles).where(eq(anonymousProfiles.userId, registeredUserId))
  await db.delete(invites).where(eq(invites.code, inviteCode))
  if (companyId) await db.delete(companies).where(eq(companies.id, companyId))
  const ids = [inviterId, moderatorId, registeredUserId].filter(Boolean)
  if (ids.length) await db.delete(users).where(inArray(users.id, ids))
  await pool.end()
})

test("邀请注册、评价审核公开和账号注销形成真实数据库闭环", async ({ request }) => {
  const email = `release-user-${randomUUID()}@integration.sinan.test`
  const registerResponse = await request.post("/api/auth/register", {
    headers: { "X-Sinan-Client": "ios" },
    data: { email, password: "ReleaseTest123!", inviteCode },
  })
  expect(registerResponse.status()).toBe(201)
  const registration = await registerResponse.json()
  registeredUserId = registration.user.id
  const userToken = registration.token as string
  expect(userToken).toBeTruthy()

  const loginResponse = await request.post("/api/auth/login", {
    headers: { "X-Sinan-Client": "ios" },
    data: { email, password: "ReleaseTest123!" },
  })
  expect(loginResponse.status()).toBe(200)
  expect((await loginResponse.json()).user.id).toBe(registeredUserId)

  const searchResponse = await request.get(
    `/api/companies/search?q=${encodeURIComponent(`Release Company`)}`,
  )
  expect(searchResponse.status()).toBe(200)
  const search = await searchResponse.json()
  expect(search.companies.some((item: { id: string }) => item.id === companyId)).toBe(true)

  const detailBeforeReview = await request.get(`/api/companies/${companyId}`)
  expect(detailBeforeReview.status()).toBe(200)
  expect((await detailBeforeReview.json()).company.reviewCount).toBe(0)

  const reviewResponse = await request.post("/api/reviews", {
    headers: { Authorization: `Bearer ${userToken}`, "X-Sinan-Client": "ios" },
    data: {
      companyId,
      authorRole: "current_employee",
      title: "Release 真实闭环评价",
      content: "这是一条用于 staging 发布验收的真实数据库评价，验证提交、审核、公开与注销流程。",
      directionScore: 8,
      jobTitle: "测试工程师",
      ratingDimensions: { pay_worth: 4, growth: 4, leader: 4, overtime_truth: 3, promise_delivery: 4 },
    },
  })
  expect(reviewResponse.status()).toBe(201)
  const submitted = await reviewResponse.json()
  reviewId = submitted.review.id
  expect(submitted.review.status).toBe("pending_review")

  const queueResponse = await request.get("/api/moderation/reviews", {
    headers: { Authorization: `Bearer ${moderatorToken}`, "X-Sinan-Client": "ios" },
  })
  expect(queueResponse.status()).toBe(200)
  const queue = await queueResponse.json()
  expect(queue.reviews.some((item: { id: string }) => item.id === reviewId)).toBe(true)

  const moderationResponse = await request.patch(`/api/moderation/reviews/${reviewId}`, {
    headers: { Authorization: `Bearer ${moderatorToken}`, "X-Sinan-Client": "ios" },
    data: { action: "approve" },
  })
  expect(moderationResponse.status()).toBe(200)

  const publicResponse = await request.get(`/api/companies/${companyId}/reviews`)
  expect(publicResponse.status()).toBe(200)
  const publicReviews = await publicResponse.json()
  expect(publicReviews.reviews.some((item: { id: string }) => item.id === reviewId)).toBe(true)

  const usefulResponse = await request.post(`/api/reviews/${reviewId}/useful`, {
    headers: { Authorization: `Bearer ${userToken}`, "X-Sinan-Client": "ios" },
    data: { useful: true },
  })
  expect(usefulResponse.status()).toBe(200)
  expect(await usefulResponse.json()).toMatchObject({
    usefulCount: 1,
    isUsefulByCurrentUser: true,
  })

  const detailAfterReview = await request.get(`/api/companies/${companyId}`)
  expect(detailAfterReview.status()).toBe(200)
  const publicCompany = (await detailAfterReview.json()).company
  expect(publicCompany.reviewCount).toBe(1)
  expect(publicCompany.directionScore).toBe(8)

  const companyPageResponse = await request.get(`/company/${companyId}`)
  expect(companyPageResponse.status()).toBe(200)
  const companyPageHtml = await companyPageResponse.text()
  expect(companyPageHtml).toContain("Release 真实闭环评价")
  expect(companyPageHtml).not.toContain("MVP mock")

  const reviewsPageResponse = await request.get(`/company/${companyId}/reviews`)
  expect(reviewsPageResponse.status()).toBe(200)
  expect(await reviewsPageResponse.text()).toContain("Release 真实闭环评价")

  const reviewPageResponse = await request.get(`/company/${companyId}/reviews/${reviewId}`)
  expect(reviewPageResponse.status()).toBe(200)
  const reviewPageHtml = await reviewPageResponse.text()
  expect(reviewPageHtml).toContain("Release 真实闭环评价")
  expect(reviewPageHtml).toContain("首发 Beta 暂不开放公开追问")

  const researchResponse = await request.get("/api/research")
  expect(researchResponse.status()).toBe(200)
  const research = await researchResponse.json()
  expect(research.companies.length).toBeGreaterThan(0)
  const reportResponse = await request.get(`/api/research/${research.companies[0].slug}`)
  expect(reportResponse.status()).toBe(200)
  expect((await reportResponse.json()).card.name).toBe(research.companies[0].name)

  const deleteResponse = await request.delete("/api/me/account", {
    headers: { Authorization: `Bearer ${userToken}`, "X-Sinan-Client": "ios" },
    data: { confirmation: "DELETE" },
  })
  expect(deleteResponse.status()).toBe(200)

  const [reviewAfterDeletion] = await db
    .select({ authorUserId: reviews.authorUserId, anonymousProfileId: reviews.anonymousProfileId })
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1)
  expect(reviewAfterDeletion.authorUserId).toBeNull()
  expect(reviewAfterDeletion.anonymousProfileId).toBeNull()

  const [userAfterDeletion] = await db
    .select({ email: users.email, phone: users.phone, passwordHash: users.passwordHash, status: users.status })
    .from(users)
    .where(eq(users.id, registeredUserId))
    .limit(1)
  expect(userAfterDeletion).toMatchObject({ email: null, phone: null, passwordHash: null, status: "deleted" })

  const sessionAfterDeletion = await request.get("/api/auth/me", {
    headers: { Authorization: `Bearer ${userToken}`, "X-Sinan-Client": "ios" },
  })
  expect(sessionAfterDeletion.status()).toBe(200)
  expect((await sessionAfterDeletion.json()).user).toBeNull()
})
