import { randomUUID } from "node:crypto"

import { expect, test } from "@playwright/test"
import { eq, inArray } from "drizzle-orm"

import { db, pool } from "../../src/db/client"
import { auctionBids, auctions } from "../../src/db/schema/auctions"
import { companies } from "../../src/db/schema/companies"
import { companyVerifications } from "../../src/db/schema/company-verifications"
import { emailVerificationCodes } from "../../src/db/schema/email-verification-codes"
import { invites } from "../../src/db/schema/invites"
import { moderationEvents } from "../../src/db/schema/moderation-events"
import { reviews } from "../../src/db/schema/reviews"
import { reviewUsefulVotes } from "../../src/db/schema/review-useful-votes"
import { users } from "../../src/db/schema/users"
import {
  exerciseHeartPick,
  settleByHighestBid,
} from "../../src/lib/server/auction-engine"
import { consumeInvite } from "../../src/lib/server/invites"
import {
  confirmVerificationCode,
  issueVerificationCode,
  MAX_ATTEMPTS,
} from "../../src/lib/server/verification"
import { moderateReview } from "../../src/lib/server/review-moderation"
import { setReviewUseful } from "../../src/lib/server/review-useful"

const createdUserIds: string[] = []
const createdCompanyIds: string[] = []
const createdVerificationIds: string[] = []
const createdAuctionIds: string[] = []
const createdReviewIds: string[] = []

async function createUser(label: string) {
  const [user] = await db
    .insert(users)
    .values({
      email: `${label}-${randomUUID()}@integration.sinan.test`,
      displayName: label,
    })
    .returning({ id: users.id })
  createdUserIds.push(user.id)
  return user.id
}

test.afterEach(async () => {
  if (createdReviewIds.length > 0) {
    await db.delete(moderationEvents).where(inArray(moderationEvents.entityId, createdReviewIds))
    await db.delete(reviewUsefulVotes).where(inArray(reviewUsefulVotes.reviewId, createdReviewIds))
    await db.delete(reviews).where(inArray(reviews.id, createdReviewIds))
    createdReviewIds.length = 0
  }
  if (createdAuctionIds.length > 0) {
    await db.delete(auctions).where(inArray(auctions.id, createdAuctionIds))
    createdAuctionIds.length = 0
  }
  if (createdCompanyIds.length > 0) {
    if (createdVerificationIds.length > 0) {
      await db
        .delete(emailVerificationCodes)
        .where(
          inArray(
            emailVerificationCodes.verificationId,
            createdVerificationIds
          )
        )
      createdVerificationIds.length = 0
    }
    await db
      .delete(companyVerifications)
      .where(inArray(companyVerifications.companyId, createdCompanyIds))
    await db.delete(companies).where(inArray(companies.id, createdCompanyIds))
    createdCompanyIds.length = 0
  }
  if (createdUserIds.length > 0) {
    await db.delete(invites).where(inArray(invites.inviterUserId, createdUserIds))
    await db.delete(users).where(inArray(users.id, createdUserIds))
    createdUserIds.length = 0
  }
})

test.afterAll(async () => {
  await pool.end()
})

test("an invite can be consumed by only one concurrent registration", async () => {
  const inviterId = await createUser("inviter")
  const firstInviteeId = await createUser("invitee-a")
  const secondInviteeId = await createUser("invitee-b")
  const [invite] = await db
    .insert(invites)
    .values({ code: `IT${randomUUID().replaceAll("-", "").slice(0, 6)}`.toUpperCase(), inviterUserId: inviterId })
    .returning({ id: invites.id })

  const results = await Promise.all([
    consumeInvite(db, invite.id, firstInviteeId),
    consumeInvite(db, invite.id, secondInviteeId),
  ])

  expect(results.filter(Boolean)).toHaveLength(1)
  const [stored] = await db.select().from(invites).where(eq(invites.id, invite.id))
  expect(stored.status).toBe("used")
  expect([firstInviteeId, secondInviteeId]).toContain(stored.invitedUserId)
})

test("a verification code approves exactly once under concurrency", async () => {
  const applicantId = await createUser("verification-applicant")
  const [company] = await db
    .insert(companies)
    .values({ name: `Integration ${randomUUID()}`, city: "上海", industry: "科技" })
    .returning({ id: companies.id })
  createdCompanyIds.push(company.id)
  const [verification] = await db
    .insert(companyVerifications)
    .values({
      companyId: company.id,
      companyName: "Integration Company",
      applicantUserId: applicantId,
      applicantName: "Integration User",
      workEmail: `employee-${randomUUID()}@integration.sinan.test`,
      jobTitle: "Engineer",
      proofType: "work_email",
    })
    .returning({ id: companyVerifications.id })
  createdVerificationIds.push(verification.id)
  const code = await issueVerificationCode(verification.id)

  const results = await Promise.all([
    confirmVerificationCode(verification.id, code),
    confirmVerificationCode(verification.id, code),
  ])

  expect(results.filter((result) => result === "ok")).toHaveLength(1)
  const [storedCompany] = await db
    .select({ count: companies.verifiedIdentityCount })
    .from(companies)
    .where(eq(companies.id, company.id))
  const [storedUser] = await db
    .select({ trustLevel: users.trustLevel })
    .from(users)
    .where(eq(users.id, applicantId))
  expect(storedCompany.count).toBe(1)
  expect(storedUser.trustLevel).toBe(1)
})

test("concurrent invalid codes cannot bypass the attempt limit", async () => {
  const applicantId = await createUser("attempt-limit-applicant")
  const [company] = await db
    .insert(companies)
    .values({ name: `Attempt Limit ${randomUUID()}`, city: "上海", industry: "科技" })
    .returning({ id: companies.id })
  createdCompanyIds.push(company.id)
  const [verification] = await db
    .insert(companyVerifications)
    .values({
      companyId: company.id,
      companyName: "Attempt Limit Company",
      applicantUserId: applicantId,
      applicantName: "Integration User",
      workEmail: `attempts-${randomUUID()}@integration.sinan.test`,
      jobTitle: "Engineer",
      proofType: "work_email",
    })
    .returning({ id: companyVerifications.id })
  createdVerificationIds.push(verification.id)
  const validCode = await issueVerificationCode(verification.id)

  await Promise.all(
    Array.from({ length: MAX_ATTEMPTS * 2 }, () =>
      confirmVerificationCode(verification.id, "999999")
    )
  )

  const [storedCode] = await db
    .select({ attemptCount: emailVerificationCodes.attemptCount })
    .from(emailVerificationCodes)
    .where(eq(emailVerificationCodes.verificationId, verification.id))
  expect(storedCode.attemptCount).toBe(MAX_ATTEMPTS)
  expect(await confirmVerificationCode(verification.id, validCode)).toBe(
    "too_many_attempts"
  )
})

test("concurrent auction settlement produces exactly one winner", async () => {
  const hostId = await createUser("auction-host")
  const bidderAId = await createUser("bidder-a")
  const bidderBId = await createUser("bidder-b")
  const now = Date.now()
  const [auction] = await db
    .insert(auctions)
    .values({
      hostUserId: hostId,
      hostDisplayName: "Integration Host",
      hostTrustLevel: 2,
      scenarioTitle: "Concurrency Test",
      scenarioDesc: "Disposable staging integration test",
      durationMinutes: 30,
      guidePriceMinCents: 10_000,
      guidePriceMaxCents: 30_000,
      status: "closed",
      startsAt: new Date(now - 60 * 60 * 1000),
      endsAt: new Date(now - 30 * 60 * 1000),
      closedAt: new Date(now - 30 * 60 * 1000),
    })
    .returning({ id: auctions.id })
  createdAuctionIds.push(auction.id)
  const bids = await db
    .insert(auctionBids)
    .values([
      {
        auctionId: auction.id,
        bidderUserId: bidderAId,
        bidderTrustLevel: 1,
        amountCents: 20_000,
        reasonText: "highest bid",
      },
      {
        auctionId: auction.id,
        bidderUserId: bidderBId,
        bidderTrustLevel: 1,
        amountCents: 15_000,
        reasonText: "heart pick",
      },
    ])
    .returning({ id: auctionBids.id })

  const results = await Promise.allSettled([
    settleByHighestBid(auction.id, hostId),
    exerciseHeartPick(auction.id, bids[1].id, hostId),
  ])

  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
  const storedBids = await db
    .select({ id: auctionBids.id, status: auctionBids.status })
    .from(auctionBids)
    .where(eq(auctionBids.auctionId, auction.id))
  expect(storedBids.filter((bid) => bid.status === "won")).toHaveLength(1)
  expect(storedBids.filter((bid) => bid.status === "active")).toHaveLength(0)
})

test("concurrent review moderation publishes once and writes one audit event", async () => {
  const moderatorId = await createUser("review-moderator")
  await db.update(users).set({ role: "moderator" }).where(eq(users.id, moderatorId))
  const [company] = await db
    .insert(companies)
    .values({ name: `Review Flow ${randomUUID()}`, city: "上海", industry: "科技", reviewStatus: "reviewable" })
    .returning({ id: companies.id })
  createdCompanyIds.push(company.id)
  const [review] = await db
    .insert(reviews)
    .values({
      companyId: company.id,
      authorRole: "current_employee",
      authorLabel: "匿名在职员工",
      title: "真实数据闭环测试",
      content: "这是一条仅用于 staging 数据库验收的评价内容，不会进入生产环境。",
      directionScore: "8.0",
      ratingDimensions: { pay_worth: 8, growth: 8, leader: 8, overtime_truth: 8, promise_delivery: 8 },
    })
    .returning({ id: reviews.id })
  createdReviewIds.push(review.id)

  const results = await Promise.all([
    moderateReview({ reviewId: review.id, moderator: { userId: moderatorId, role: "moderator" }, action: "approve" }),
    moderateReview({ reviewId: review.id, moderator: { userId: moderatorId, role: "moderator" }, action: "approve" }),
  ])

  expect(results.filter((result) => result.kind === "updated")).toHaveLength(1)
  expect(results.filter((result) => result.kind === "conflict")).toHaveLength(1)
  const [stored] = await db.select({ status: reviews.status }).from(reviews).where(eq(reviews.id, review.id))
  expect(stored.status).toBe("visible")
  const auditRows = await db.select().from(moderationEvents).where(eq(moderationEvents.entityId, review.id))
  expect(auditRows).toHaveLength(1)
  expect(auditRows[0]).toMatchObject({ fromStatus: "pending_review", toStatus: "visible", actorUserId: moderatorId })
})

test("review useful votes are persistent, idempotent, and preserve the legacy baseline", async () => {
  const voterId = await createUser("review-voter")
  const [company] = await db
    .insert(companies)
    .values({
      name: `Useful Vote ${randomUUID()}`,
      city: "上海",
      industry: "科技",
      reviewStatus: "reviewable",
    })
    .returning({ id: companies.id })
  createdCompanyIds.push(company.id)
  const [review] = await db
    .insert(reviews)
    .values({
      companyId: company.id,
      authorRole: "former_employee",
      authorLabel: "匿名过来人",
      title: "有用票持久化测试",
      content: "这是一条用于验证有用票服务端持久化和历史基线的测试评价。",
      directionScore: "7.5",
      usefulCount: 9,
      usefulVoteBaseline: 9,
      status: "visible",
      ratingDimensions: {
        pay_worth: 7,
        growth: 8,
        leader: 7,
        overtime_truth: 7,
        promise_delivery: 8,
      },
    })
    .returning({ id: reviews.id })
  createdReviewIds.push(review.id)

  const results = await Promise.all([
    setReviewUseful({ reviewId: review.id, userId: voterId, useful: true }),
    setReviewUseful({ reviewId: review.id, userId: voterId, useful: true }),
  ])
  expect(results.every((result) => result.kind === "updated")).toBe(true)

  const [storedAfterAdd] = await db
    .select({ usefulCount: reviews.usefulCount })
    .from(reviews)
    .where(eq(reviews.id, review.id))
  expect(storedAfterAdd.usefulCount).toBe(10)
  expect(
    await db
      .select()
      .from(reviewUsefulVotes)
      .where(eq(reviewUsefulVotes.reviewId, review.id))
  ).toHaveLength(1)

  const removed = await setReviewUseful({
    reviewId: review.id,
    userId: voterId,
    useful: false,
  })
  expect(removed).toMatchObject({
    kind: "updated",
    usefulCount: 9,
    isUsefulByCurrentUser: false,
  })
})
