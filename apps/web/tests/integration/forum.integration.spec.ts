import { randomUUID } from "node:crypto"
import { eq, inArray } from "drizzle-orm"
import { expect, test } from "../database-fixture"
import { db } from "../../src/db/client"
import { companies } from "../../src/db/schema/companies"
import { users } from "../../src/db/schema/users"
import { forumPosts, forumReplies, forumFollows, forumModerationEvents } from "../../src/db/schema/forum"
import { reviewAuthorBlocks } from "../../src/db/schema/review-author-blocks"
import { createForumPost, getForumFeed, getForumDetail, moderateForum, voteForum, replyToForum, followForum, deleteForumContent, reportForum, getForumQueue } from "../../src/lib/server/forum-service"
import type { ForumFilters } from "../../src/lib/forum"
const companyIds: string[] = [], userIds: string[] = []
test.afterEach(async () => {
  if (companyIds.length) { await db.delete(forumPosts).where(inArray(forumPosts.companyId, companyIds)); await db.delete(forumFollows).where(inArray(forumFollows.companyId, companyIds)); await db.delete(companies).where(inArray(companies.id, companyIds)) }
  if (userIds.length) { await db.delete(reviewAuthorBlocks).where(inArray(reviewAuthorBlocks.blockerUserId, userIds)); await db.delete(users).where(inArray(users.id, userIds)) }
  companyIds.length = userIds.length = 0
})
async function fixture() {
  const [company] = await db.insert(companies).values({ name: "论坛隔离测试 " + randomUUID(), city: "上海", industry: "软件", reviewStatus: "reviewable" }).returning()
  companyIds.push(company.id)
  const people = await db.insert(users).values(["owner", "reader", "moderator"].map((name, i) => ({ displayName: name, email: `${randomUUID()}@forum.test`, role: i === 2 ? "moderator" as const : "user" as const }))).returning()
  userIds.push(...people.map(p => p.id))
  const [owner, reader, moderator] = people
  const input = { requestId: randomUUID(), companyId: company.id, category: "question" as const, title: "团队怎样安排工作？", content: "想了解团队之间的协作方式与日常工作节奏。" }
  const filters: ForumFilters = { companyId: company.id, feed: "all", sort: "latest" }
  return { company, owner, reader, moderator, input, filters }
}
test("global and company search respect literal text, moderation and followed-company scope", async () => {
  const f = await fixture(), g = await fixture(), token = randomUUID()
  const [first] = await db.insert(forumPosts).values({ ...f.input, title: token + " 工作讨论", content: `${token} 50%_\\ 的真实工作经历。`, authorUserId: f.owner.id, status: "visible" }).returning()
  const [second] = await db.insert(forumPosts).values({ ...g.input, title: token + " 面试交流", authorUserId: g.owner.id, status: "visible" }).returning()
  await createForumPost(f.owner.id, { ...f.input, requestId: randomUUID(), title: token + " 待审内容" })
  const all = { feed: "all" as const, sort: "latest" as const, q: token }
  expect(new Set((await getForumFeed(all)).posts.map(p => p.id))).toEqual(new Set([first.id, second.id]))
  expect((await getForumFeed({ ...all, companyId: f.company.id })).posts.map(p => p.id)).toEqual([first.id])
  expect((await getForumFeed({ ...all, companyId: f.company.id, q: "50%_\\" })).posts.map(p => p.id)).toEqual([first.id])
  expect((await getForumFeed({ ...all, feed: "mine" }, f.owner.id)).posts).toHaveLength(2)
  expect((await getForumFeed({ ...all, feed: "following" }, f.reader.id)).posts).toHaveLength(0)
  await followForum(f.reader.id, f.company.id, true)
  expect((await getForumFeed({ ...all, feed: "following" }, f.reader.id)).posts.map(p => p.id)).toEqual([first.id])
  await db.insert(reviewAuthorBlocks).values({ blockerUserId: f.reader.id, blockedAuthorUserId: f.owner.id })
  expect((await getForumFeed({ ...all, companyId: f.company.id }, f.reader.id)).posts).toHaveLength(0)
})
test("forum moderation protects pending content, identity and parent visibility", async () => {
  const f = await fixture(), post = await createForumPost(f.owner.id, f.input)
  expect((await getForumFeed(f.filters)).posts).toEqual([])
  expect((await getForumFeed({ ...f.filters, feed: "mine" }, f.owner.id)).posts[0].status).toBe("pending_review")
  await expect(getForumDetail(post.id, f.reader.id)).rejects.toMatchObject({ status: 404 })
  const action = { kind: "post" as const, id: post.id, postId: post.id, status: "visible" as const, expectedStatus: "pending_review", reason: "测试通过" }
  await expect(moderateForum(f.reader.id, action)).rejects.toMatchObject({ status: 403 })
  await moderateForum(f.moderator.id, action)
  await expect(moderateForum(f.moderator.id, action)).rejects.toMatchObject({ status: 409 })
  const json = JSON.stringify(await getForumDetail(post.id))
  for (const secret of [f.owner.id, f.owner.email!, "authorUserId", "requestId", "anonymousProfileId"]) expect(json).not.toContain(secret)
  const reply = await replyToForum(f.reader.id, post.id, "可以按项目了解团队节奏。", randomUUID())
  expect((await getForumDetail(post.id)).replies).toHaveLength(0)
  expect((await getForumDetail(post.id, f.reader.id)).myReplies).toHaveLength(1)
  await moderateForum(f.moderator.id, { ...action, kind: "reply", id: reply.id })
  expect((await getForumDetail(post.id)).replies).toHaveLength(1)
  await reportForum(f.reader.id, post.id, "other", reply.id)
  expect((await getForumQueue()).reported).toHaveLength(1)
  await moderateForum(f.moderator.id, { ...action, expectedStatus: "visible", status: "hidden" })
  await expect(getForumDetail(post.id, f.reader.id)).rejects.toMatchObject({ status: 404 })
  expect((await getForumFeed(f.filters)).posts).toHaveLength(0)
  await expect(moderateForum(f.moderator.id, { ...action, kind: "reply", id: reply.id, expectedStatus: "visible" })).rejects.toMatchObject({ status: 409 })
  await moderateForum(f.moderator.id, { ...action, kind: "reply", id: reply.id, expectedStatus: "visible", status: "hidden" })
  expect((await getForumQueue()).reported).toHaveLength(0)
  expect(await db.select().from(forumModerationEvents).where(eq(forumModerationEvents.postId, post.id))).toHaveLength(4)
})
test("forum writes idempotent, concurrent votes consistent, follow and deletion isolated", async () => {
  const f = await fixture(), repeated = await Promise.all(Array.from({ length: 4 }, () => createForumPost(f.owner.id, f.input)))
  expect(new Set(repeated.map(r => r.id)).size).toBe(1)
  const id = repeated[0].id
  await moderateForum(f.moderator.id, { kind: "post", id, postId: id, status: "visible", expectedStatus: "pending_review", reason: "测试通过" })
  await Promise.all(Array.from({ length: 5 }, () => voteForum(f.reader.id, id, true)))
  expect((await getForumDetail(id, f.reader.id)).post).toMatchObject({ usefulCount: 1, isUseful: true })
  await voteForum(f.owner.id, id, true); await voteForum(f.reader.id, id, false)
  expect((await getForumDetail(id)).post.usefulCount).toBe(1)
  const requestId = randomUUID(), replies = await Promise.all([replyToForum(f.reader.id, id, "正常回复内容", requestId), replyToForum(f.reader.id, id, "正常回复内容", requestId)])
  expect(replies[0].id).toBe(replies[1].id)
  expect((await getForumFeed({ ...f.filters, feed: "following" }, f.reader.id)).posts).toHaveLength(0)
  await followForum(f.reader.id, f.company.id, true)
  expect((await getForumFeed({ ...f.filters, feed: "following" }, f.reader.id)).posts).toHaveLength(1)
  await db.insert(reviewAuthorBlocks).values({ blockerUserId: f.reader.id, blockedAuthorUserId: f.owner.id })
  expect((await getForumFeed(f.filters, f.reader.id)).posts).toHaveLength(0)
  await expect(deleteForumContent(f.reader.id, id)).rejects.toMatchObject({ status: 403 })
  await deleteForumContent(f.owner.id, id)
  await expect(getForumDetail(id)).rejects.toMatchObject({ status: 404 })
  await expect(voteForum(f.reader.id, id, true)).rejects.toMatchObject({ status: 404 })
})
test("forum pagination uses complete ties and archived companies never leak posts", async () => {
  const f = await fixture()
  await db.insert(forumPosts).values(Array.from({ length: 25 }, (_, i) => ({ ...f.input, requestId: randomUUID(), title: `测试帖子 ${i}`, status: "visible", authorUserId: f.owner.id, createdAt: new Date("2026-11-07T00:00:00Z") })))
  for (const sort of ["latest", "useful"] as const) {
    const first = await getForumFeed({ ...f.filters, sort }), second = await getForumFeed({ ...f.filters, sort, cursor: first.nextCursor! })
    expect(first.posts).toHaveLength(20); expect(second.posts).toHaveLength(5)
    expect(new Set([...first.posts, ...second.posts].map(p => p.id)).size).toBe(25)
  }
  const post = (await getForumFeed(f.filters)).posts[0]
  await db.insert(forumReplies).values(Array.from({ length: 52 }, () => ({ postId: post.id, content: "回复分页测试", status: "visible", createdAt: new Date("2026-11-07T00:00:00Z") })))
  const first = await getForumDetail(post.id), next = await getForumDetail(post.id, undefined, first.nextCursor!)
  expect(first.replies).toHaveLength(50); expect(next.replies).toHaveLength(2)
  expect(new Set([...first.replies, ...next.replies].map(r => r.id)).size).toBe(52)
  await db.update(companies).set({ reviewStatus: "pending_review" }).where(eq(companies.id, f.company.id))
  expect((await getForumFeed(f.filters)).posts).toEqual([])
  await expect(getForumDetail(post.id)).rejects.toMatchObject({ status: 404 })
})
