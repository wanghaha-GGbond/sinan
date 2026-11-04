import { randomUUID } from "node:crypto"
import { eq, inArray } from "drizzle-orm"
import { expect, test } from "../database-fixture"
import { db } from "../../src/db/client"
import { companies } from "../../src/db/schema/companies"
import { reviews } from "../../src/db/schema/reviews"
import { reviewDiscussions } from "../../src/db/schema/review-discussions"
import { reviewAuthorBlocks } from "../../src/db/schema/review-author-blocks"
import { users } from "../../src/db/schema/users"
import { getCommunityFeed } from "../../src/lib/server/community-feed"

const companyIds: string[] = []
const reviewIds: string[] = []
const userIds: string[] = []

test.afterEach(async () => {
  if (userIds.length) await db.delete(reviewAuthorBlocks).where(inArray(reviewAuthorBlocks.blockerUserId, userIds))
  if (companyIds.length) await db.delete(reviewDiscussions).where(inArray(reviewDiscussions.companyId, companyIds))
  if (reviewIds.length) await db.delete(reviews).where(inArray(reviews.id, reviewIds))
  if (companyIds.length) await db.delete(companies).where(inArray(companies.id, companyIds))
  if (userIds.length) await db.delete(users).where(inArray(users.id, userIds))
  companyIds.length = reviewIds.length = userIds.length = 0
})

async function fixture() {
  const [company] = await db.insert(companies).values({ name: `Community integration ${randomUUID()}`, city: "上海", industry: "科技", reviewStatus: "reviewable" }).returning()
  companyIds.push(company.id)
  const [review] = await db.insert(reviews).values({ companyId: company.id, authorLabel: "匿名同事", title: "隔离社区测试", content: "仅用于隔离数据库的测试评价", directionScore: "8.0", status: "visible" }).returning()
  reviewIds.push(review.id)
  return { company, review }
}

test("community excludes nonpublic records and never leaks unmasked content or author linkage", async () => {
  const { company, review } = await fixture()
  const base = { companyId: company.id, reviewId: review.id, authorLabel: "匿名同事", type: "question" as const, content: "PRIVATE_RAW_CONTENT", authorFingerprintHash: "private-linkage", status: "visible" as const, visibleToPublic: true }
  const [visible, masked, noMask] = await db.insert(reviewDiscussions).values([
    { ...base, content: "公开追问", usefulCount: 4 },
    { ...base, status: "limited_visible", maskedContent: "已脱敏内容", usefulCount: 3 },
    { ...base, status: "limited_visible", usefulCount: 2 },
    { ...base, status: "pending_review" },
    { ...base, status: "hidden" },
    { ...base, visibleToPublic: false },
    { ...base, deletedAt: new Date() },
  ]).returning()
  const feed = await getCommunityFeed({ companyId: company.id })
  expect(feed.map((row) => row.id)).toEqual([visible.id, masked.id, noMask.id])
  expect(feed[1].content).toBe("已脱敏内容")
  expect(feed[2].content).toBeNull()
  const json = JSON.stringify(feed)
  for (const secret of ["PRIVATE_RAW_CONTENT", "private-linkage", "authorUserId", "anonymousProfileId", "maskedContent", "moderationReason"]) expect(json).not.toContain(secret)
  await db.update(reviews).set({ status: "hidden" }).where(eq(reviews.id, review.id))
  expect(await getCommunityFeed({ companyId: company.id })).toEqual([])
  await db.update(reviews).set({ status: "visible" }).where(eq(reviews.id, review.id))
  await db.update(companies).set({ deletedAt: new Date() }).where(eq(companies.id, company.id))
  expect(await getCommunityFeed({ companyId: company.id })).toEqual([])
})

test("community respects filters and blocked authors of both discussions and parent reviews", async () => {
  const { company, review } = await fixture()
  const created = await db.insert(users).values(["viewer", "discussion-author", "review-author"].map((label) => ({ email: `${label}-${randomUUID()}@integration.sinan.test`, displayName: label }))).returning()
  userIds.push(...created.map((row) => row.id))
  const [viewer, author, parentAuthor] = created
  await db.update(reviews).set({ authorUserId: parentAuthor.id }).where(eq(reviews.id, review.id))
  await db.insert(reviewDiscussions).values({ companyId: company.id, reviewId: review.id, authorUserId: author.id, authorLabel: "匿名同事", type: "supplement", content: "公开补充", status: "visible", visibleToPublic: true })
  expect(await getCommunityFeed({ companyId: company.id, type: "question" })).toEqual([])
  expect(await getCommunityFeed({ companyId: company.id, city: "北京" })).toEqual([])
  expect(await getCommunityFeed({ companyId: company.id, industry: "科技", type: "supplement", city: "上海", sort: "latest" })).toHaveLength(1)
  await db.insert(reviewAuthorBlocks).values({ blockerUserId: viewer.id, blockedAuthorUserId: author.id })
  expect(await getCommunityFeed({ companyId: company.id }, viewer.id)).toEqual([])
  await db.delete(reviewAuthorBlocks).where(eq(reviewAuthorBlocks.blockerUserId, viewer.id))
  await db.insert(reviewAuthorBlocks).values({ blockerUserId: viewer.id, blockedAuthorUserId: parentAuthor.id })
  expect(await getCommunityFeed({ companyId: company.id }, viewer.id)).toEqual([])
  expect(await getCommunityFeed({ companyId: company.id })).toHaveLength(1)
})
