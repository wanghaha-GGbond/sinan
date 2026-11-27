import { randomUUID } from "node:crypto"
import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import { NextRequest } from "next/server"
import { test, expect } from "../database-fixture"
import { db } from "../../src/db/client"
import { companies } from "../../src/db/schema/companies"
import { reviews } from "../../src/db/schema/reviews"
import { findPublicReview } from "../../src/lib/server/public-review-query"
import { GET as list } from "../../src/app/api/reviews/route"
import { GET as detail } from "../../src/app/api/reviews/[reviewId]/route"
import { GET as discussions } from "../../src/app/api/reviews/[reviewId]/discussions/route"
import { users } from "../../src/db/schema/users"
import { reviewDiscussions } from "../../src/db/schema/review-discussions"
import { discussionUsefulVotes } from "../../src/db/schema/discussion-useful-votes"
import { signToken } from "../../src/lib/server/auth"
import { GET as dashboard } from "../../src/app/api/me/route"
import { GET as personalReviews } from "../../src/app/api/me/reviews/route"
import { DELETE as deleteAccount } from "../../src/app/api/me/account/route"
import { POST as vote } from "../../src/app/api/review-discussions/[discussionId]/useful/route"
import type { MyReview } from "../../src/lib/my-reviews"

test("personal review pages keep microsecond and UUID boundaries and exclude other accounts", async () => {
  const [company] = await db.insert(companies).values({ name: `Paging ${randomUUID()}`, city: "杭州", industry: "软件" }).returning()
  const accounts = await db.insert(users).values([0, 1].map(() => ({ email: `${randomUUID()}@fixture.test` }))).returning()
  try {
    const common = { companyId: company.id, authorUserId: accounts[0].id, authorLabel: "匿名", title: "评价", content: "测试记录", directionScore: "8", usefulCount: 1 }
    const ordered = Array.from({ length: 25 }, (_, i) => ({
      ...common, id: randomUUID(),
      // First page ends in the middle of a same-microsecond pair.
      micros: Math.floor(i / 2),
    })).sort((a, b) => b.micros - a.micros || (a.id > b.id ? -1 : 1))
    await db.insert(reviews).values(ordered.map(({ micros, ...fields }) => ({
      ...fields, createdAt: sql`timestamptz '2025-01-01T00:00:00Z' + ${micros}::int * interval '1 microsecond'`,
    })))
    await db.insert(reviews).values([{ ...common, deletedAt: new Date() }, { ...common, authorUserId: accounts[1].id }])
    const tokens = await Promise.all(accounts.map(a => signToken({ userId: a.id, role: "user" })))
    const req = (path: string, token = tokens[0]) => new NextRequest(`https://fixture.test${path}`, { headers: { Authorization: `Bearer ${token}` } })
    const head = await dashboard(req("/api/me"))
    expect(head.status).toBe(200)
    const first = await head.json()
    expect(first.user.usefulCount).toBe(25)
    expect(first.myReviews.map((r: MyReview) => r.id)).toEqual(ordered.slice(0, 20).map(r => r.id))
    expect(typeof first.myReviewsNextCursor).toBe("string")
    await db.insert(reviews).values(common)
    const next = `/api/me/reviews?cursor=${first.myReviewsNextCursor}`
    const second = await personalReviews(req(next))
    expect(second.status).toBe(200)
    expect(second.headers.get("cache-control")).toContain("no-store")
    const tail = await second.json()
    expect(tail.reviews.map((r: MyReview) => r.id)).toEqual(ordered.slice(20).map(r => r.id))
    expect(tail.nextCursor).toBeNull()
    expect((await (await personalReviews(req(next, tokens[1]))).json()).reviews).toEqual([])
    expect((await personalReviews(req(next, "invalid-fixture"))).status).toBe(401)
    expect((await personalReviews(req("/api/me/reviews?cursor=invalid"))).status).toBe(400)
  } finally {
    await db.delete(reviews).where(eq(reviews.companyId, company.id))
    await db.delete(companies).where(eq(companies.id, company.id))
    await db.delete(users).where(inArray(users.id, accounts.map(a => a.id)))
  }
})

test("parallel discussion votes, repeated requests and removals keep the public count exact", async () => {
  const [company] = await db.insert(companies).values({ name: `Votes ${randomUUID()}`, city: "杭州", industry: "软件", reviewStatus: "reviewable" }).returning()
  const accounts = await db.insert(users).values(Array.from({ length: 6 }, () => ({ email: `${randomUUID()}@fixture.test` }))).returning()
  const [review] = await db.insert(reviews).values({ companyId: company.id, authorLabel: "匿名", title: "讨论投票", content: "隔离测试", status: "visible", directionScore: "8" }).returning()
  const [thread] = await db.insert(reviewDiscussions).values({ reviewId: review.id, companyId: company.id, type: "question", authorLabel: "同事", content: "讨论", status: "visible", visibleToPublic: true }).returning()
  try {
    const tokens = await Promise.all(accounts.map(a => signToken({ userId: a.id, role: "user" })))
    const cast = (token: string, useful: boolean) => vote(new NextRequest("https://fixture.test/api/vote", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ useful }),
    }), { params: Promise.resolve({ discussionId: thread.id }) })
    const verify = async (expected: number) => {
      const [stored] = await db.select().from(reviewDiscussions).where(eq(reviewDiscussions.id, thread.id))
      const active = await db.select().from(discussionUsefulVotes).where(and(eq(discussionUsefulVotes.discussionId, thread.id), isNull(discussionUsefulVotes.deletedAt), eq(discussionUsefulVotes.useful, true)))
      expect(stored.usefulCount).toBe(expected)
      expect(active).toHaveLength(expected)
    }
    const additions = await Promise.all([...tokens, tokens[0]].map(t => cast(t, true)))
    expect(additions.map(r => r.status)).toEqual(additions.map(() => 200))
    await verify(6)
    const removals = await Promise.all([0, 0, 1, 2].map(i => cast(tokens[i], false)))
    expect(removals.map(r => r.status)).toEqual([200, 200, 200, 200])
    await verify(3)
    expect(await (await cast(tokens[0], true)).json()).toEqual({ usefulCount: 4, isUsefulByCurrentUser: true })
    await verify(4)
    expect(await db.select({ id: discussionUsefulVotes.id }).from(discussionUsefulVotes)
      .where(eq(discussionUsefulVotes.discussionId, thread.id))).toHaveLength(6)
    await db.update(reviewDiscussions).set({ visibleToPublic: false }).where(eq(reviewDiscussions.id, thread.id))
    expect((await cast(tokens[1], true)).status).toBe(403)
    await verify(4)
    await db.update(reviewDiscussions).set({ visibleToPublic: true }).where(eq(reviewDiscussions.id, thread.id))
    const [removed, simultaneousVote, otherVote] = await Promise.all([
      deleteAccount(new NextRequest("https://fixture.test/api/me/account", { method: "DELETE",
        headers: { Authorization: `Bearer ${tokens[0]}`, "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }) })),
      cast(tokens[0], true), cast(tokens[1], true),
    ])
    expect(removed.status).toBe(200)
    expect(removed.headers.get("set-cookie")).toMatch(/auth_token=;/)
    expect([200, 401]).toContain(simultaneousVote.status)
    expect(otherVote.status).toBe(200)
    expect((await cast(tokens[0], true)).status).toBe(401)
    await verify(4)
  } finally {
    await db.delete(discussionUsefulVotes).where(eq(discussionUsefulVotes.discussionId, thread.id))
    await db.delete(reviewDiscussions).where(eq(reviewDiscussions.id, thread.id))
    await db.delete(reviews).where(eq(reviews.id, review.id))
    await db.delete(companies).where(eq(companies.id, company.id))
    await db.delete(users).where(inArray(users.id, accounts.map(a => a.id)))
  }
})

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
