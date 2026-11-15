import { and, or, eq, inArray, notInArray, isNull, desc, asc, lt, gt, ilike, sql, type SQL } from "drizzle-orm"
import { forumPosts, forumReplies, forumVotes, forumFollows, forumReports, forumModerationEvents } from "@/db/schema/forum"
import { companies } from "@/db/schema/companies"
import { users } from "@/db/schema/users"
import { ForumError, forumCursor, parseForumCursor, forumSearchPattern, type ForumFilters, type ForumPost, type ForumReply } from "@/lib/forum"
import { hasSensitive, hasAttackWord } from "@/lib/content-guard"
import { getBlockedReviewAuthorKeys } from "./public-review-query"
import type { z } from "zod"
import type { forumPostInput } from "@/lib/forum"

type Database = typeof import("@/db/client").db
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0]
type PostRow = typeof forumPosts.$inferSelect
async function database() {
  if (!process.env.DATABASE_URL) throw new ForumError(503, "论坛暂时不可用，请稍后重试")
  return (await import("@/db/client")).db
}
async function activeUser(tx: Tx, id: string, moderator = false) {
  const [user] = await tx.select({ role: users.role }).from(users)
    .where(and(eq(users.id, id), eq(users.status, "active"), isNull(users.deletedAt))).for("update").limit(1)
  if (!user) throw new ForumError(401, "请重新登录")
  if (moderator && !["admin", "moderator"].includes(user.role)) throw new ForumError(403, "没有审核权限")
}
async function publicCompany(db: Database | Tx, id: string) {
  const [company] = await db.select({ id: companies.id }).from(companies)
    .where(and(eq(companies.id, id), eq(companies.reviewStatus, "reviewable"), isNull(companies.deletedAt))).limit(1)
  if (!company) throw new ForumError(404, "公司不存在或暂不可讨论")
}
function safeContent(text: string) {
  if (hasSensitive(text) || hasAttackWord(text)) throw new ForumError(400, "请移除隐私信息或攻击性表达后再提交")
}
const usefulCount = sql<number>`(select count(*)::integer from forum_votes v where v.post_id = ${forumPosts.id})`
const replyCount = sql<number>`(select count(*)::integer from forum_replies r where r.post_id = ${forumPosts.id} and r.status = 'visible' and r.deleted_at is null)`
function fields(viewer?: string) {
  return { row: forumPosts, companyName: companies.name, usefulCount, replyCount,
    isUseful: viewer ? sql<boolean>`exists(select 1 from forum_votes v where v.post_id = ${forumPosts.id} and v.user_id = ${viewer}::uuid)` : sql<boolean>`false` }
}
function postView(item: { row: PostRow; companyName: string; usefulCount: number; replyCount: number; isUseful: boolean }, viewer?: string): ForumPost {
  const r = item.row
  return { id: r.id, companyId: r.companyId, companyName: item.companyName, category: r.category as ForumPost["category"],
    title: r.title, content: r.content, status: r.status, authorLabel: "匿名成员", isMine: Boolean(viewer && r.authorUserId === viewer),
    usefulCount: Number(item.usefulCount), replyCount: Number(item.replyCount), isUseful: item.isUseful, createdAt: r.createdAt.toISOString() }
}
function replyView(r: typeof forumReplies.$inferSelect, author: string | null, viewer?: string): ForumReply {
  return { id: r.id, content: r.content, status: r.status, authorLabel: "匿名成员", isMine: Boolean(viewer && r.authorUserId === viewer),
    isPostAuthor: Boolean(author && r.authorUserId === author), createdAt: r.createdAt.toISOString() }
}
async function blockedCondition(viewer?: string) {
  const blocked = await getBlockedReviewAuthorKeys(viewer)
  return blocked.userIds.size ? or(isNull(forumPosts.authorUserId), notInArray(forumPosts.authorUserId, [...blocked.userIds])) : undefined
}
const companyVisible = and(eq(companies.reviewStatus, "reviewable"), isNull(companies.deletedAt))!

export async function getForumFeed(filters: ForumFilters, viewer?: string) {
  if (filters.feed !== "all" && !viewer) throw new ForumError(401, "登录后查看")
  const cursor = parseForumCursor(filters), db = await database()
  const conditions: (SQL | undefined)[] = [companyVisible, isNull(forumPosts.deletedAt), await blockedCondition(viewer)]
  if (filters.companyId) conditions.push(eq(forumPosts.companyId, filters.companyId))
  if (filters.category) conditions.push(eq(forumPosts.category, filters.category))
  if (filters.q) {
    const pattern = forumSearchPattern(filters.q)
    conditions.push(or(ilike(forumPosts.title, pattern), ilike(forumPosts.content, pattern)))
  }
  conditions.push(filters.feed === "mine" ? eq(forumPosts.authorUserId, viewer!) : eq(forumPosts.status, "visible"))
  if (filters.feed === "following") conditions.push(inArray(forumPosts.companyId, db.select({ id: forumFollows.companyId }).from(forumFollows).where(eq(forumFollows.userId, viewer!))))
  if (cursor) {
    const nextTime = or(lt(forumPosts.createdAt, cursor.date), and(eq(forumPosts.createdAt, cursor.date), lt(forumPosts.id, cursor.id)))!
    conditions.push(filters.sort === "latest" ? nextTime : or(lt(usefulCount, cursor.useful), and(eq(usefulCount, cursor.useful), nextTime)))
  }
  const rows = await db.select(fields(viewer)).from(forumPosts).innerJoin(companies, eq(companies.id, forumPosts.companyId))
    .where(and(...conditions)).orderBy(...(filters.sort === "useful" ? [desc(usefulCount)] : []), desc(forumPosts.createdAt), desc(forumPosts.id)).limit(21)
  const page = rows.slice(0, 20), last = page.at(-1)
  return { posts: page.map(r => postView(r, viewer)), nextCursor: rows.length > 20 && last ? forumCursor(filters, { id: last.row.id, createdAt: last.row.createdAt, usefulCount: Number(last.usefulCount) }) : null }
}

export async function getForumDetail(id: string, viewer?: string, cursor?: string) {
  const db = await database()
  const [item] = await db.select(fields(viewer)).from(forumPosts).innerJoin(companies, eq(companies.id, forumPosts.companyId))
    .where(and(eq(forumPosts.id, id), isNull(forumPosts.deletedAt), companyVisible, await blockedCondition(viewer),
      viewer ? or(eq(forumPosts.status, "visible"), eq(forumPosts.authorUserId, viewer)) : eq(forumPosts.status, "visible"))).limit(1)
  if (!item) throw new ForumError(404, "帖子不存在或暂不可见")
  const replyFilters: ForumFilters = { companyId: id, feed: "all", sort: "latest", cursor }
  const position = parseForumCursor(replyFilters)
  const blocked = await getBlockedReviewAuthorKeys(viewer)
  const rows = await db.select().from(forumReplies).where(and(eq(forumReplies.postId, id), eq(forumReplies.status, "visible"), isNull(forumReplies.deletedAt),
    blocked.userIds.size ? or(isNull(forumReplies.authorUserId), notInArray(forumReplies.authorUserId, [...blocked.userIds])) : undefined,
    position ? or(gt(forumReplies.createdAt, position.date), and(eq(forumReplies.createdAt, position.date), gt(forumReplies.id, position.id))) : undefined,
  )).orderBy(asc(forumReplies.createdAt), asc(forumReplies.id)).limit(51)
  const my = viewer ? await db.select().from(forumReplies).where(and(eq(forumReplies.postId, id), eq(forumReplies.authorUserId, viewer),
    inArray(forumReplies.status, ["pending_review", "hidden", "rejected"]), isNull(forumReplies.deletedAt))).orderBy(desc(forumReplies.createdAt)).limit(20) : []
  const last = rows[49]
  return { post: postView(item, viewer), replies: rows.slice(0, 50).map(r => replyView(r, item.row.authorUserId, viewer)),
    myReplies: my.map(r => replyView(r, item.row.authorUserId, viewer)), nextCursor: rows.length > 50 && last ? forumCursor(replyFilters, { ...last, usefulCount: 0 }) : null }
}

export async function createForumPost(userId: string, data: z.infer<typeof forumPostInput>) {
  safeContent(data.title + "\n" + data.content)
  const db = await database()
  return db.transaction(async tx => {
    await activeUser(tx, userId); await publicCompany(tx, data.companyId)
    const [row] = await tx.insert(forumPosts).values({ ...data, authorUserId: userId, status: "pending_review" }).onConflictDoNothing().returning({ id: forumPosts.id, status: forumPosts.status })
    if (row) return row
    const [existing] = await tx.select().from(forumPosts).where(and(eq(forumPosts.authorUserId, userId), eq(forumPosts.requestId, data.requestId))).limit(1)
    if (!existing || existing.deletedAt || existing.title !== data.title || existing.content !== data.content || existing.companyId !== data.companyId || existing.category !== data.category) throw new ForumError(409, "提交编号已使用，请刷新后重新发帖")
    return { id: existing.id, status: existing.status }
  })
}
async function lockedPost(tx: Tx, id: string, requirePublicCompany = true) {
  const [post] = await tx.select().from(forumPosts).where(and(eq(forumPosts.id, id), isNull(forumPosts.deletedAt))).for("update").limit(1)
  if (!post) throw new ForumError(404, "帖子不存在")
  if (requirePublicCompany) await publicCompany(tx, post.companyId)
  return post
}
export async function replyToForum(userId: string, id: string, content: string, requestId: string) {
  safeContent(content)
  const db = await database()
  return db.transaction(async tx => {
    await activeUser(tx, userId); const post = await lockedPost(tx, id)
    if (post.status !== "visible") throw new ForumError(404, "帖子暂不可回复")
    const [reply] = await tx.insert(forumReplies).values({ postId: id, authorUserId: userId, content, requestId, status: "pending_review" }).onConflictDoNothing().returning({ id: forumReplies.id, status: forumReplies.status })
    if (reply) return reply
    const [existing] = await tx.select().from(forumReplies).where(and(eq(forumReplies.authorUserId, userId), eq(forumReplies.requestId, requestId))).limit(1)
    if (!existing || existing.deletedAt || existing.postId !== id || existing.content !== content) throw new ForumError(409, "提交编号已使用，请刷新后重试")
    return { id: existing.id, status: existing.status }
  })
}
export async function voteForum(userId: string, id: string, useful: boolean) {
  const db = await database()
  return db.transaction(async tx => {
    await activeUser(tx, userId); const post = await lockedPost(tx, id)
    if (post.status !== "visible") throw new ForumError(404, "帖子暂不可操作")
    if (useful) await tx.insert(forumVotes).values({ postId: id, userId }).onConflictDoNothing()
    else await tx.delete(forumVotes).where(and(eq(forumVotes.postId, id), eq(forumVotes.userId, userId)))
    const [result] = await tx.select({ count: sql<number>`count(*)::integer` }).from(forumVotes).where(eq(forumVotes.postId, id))
    return { usefulCount: Number(result.count), isUseful: useful }
  })
}
export async function getForumFollows(userId: string) {
  const db = await database()
  const rows = await db.select({ id: forumFollows.companyId }).from(forumFollows).innerJoin(companies, eq(companies.id, forumFollows.companyId))
    .where(and(eq(forumFollows.userId, userId), companyVisible))
  return { companyIds: rows.map(r => r.id) }
}
export async function followForum(userId: string, companyId: string, following: boolean) {
  const db = await database()
  return db.transaction(async tx => {
    await activeUser(tx, userId); await publicCompany(tx, companyId)
    if (following) await tx.insert(forumFollows).values({ companyId, userId }).onConflictDoNothing()
    else await tx.delete(forumFollows).where(and(eq(forumFollows.companyId, companyId), eq(forumFollows.userId, userId)))
    return { companyId, following }
  })
}
export async function reportForum(userId: string, id: string, reason: string, replyId?: string) {
  const db = await database()
  return db.transaction(async tx => {
    await activeUser(tx, userId); const post = await lockedPost(tx, id)
    if (post.status !== "visible") throw new ForumError(404, "帖子暂不可举报")
    if (replyId) {
      const [reply] = await tx.select({ id: forumReplies.id }).from(forumReplies)
        .where(and(eq(forumReplies.id, replyId), eq(forumReplies.postId, id), eq(forumReplies.status, "visible"), isNull(forumReplies.deletedAt))).limit(1)
      if (!reply) throw new ForumError(404, "回复暂不可举报")
    }
    await tx.insert(forumReports).values({ postId: id, replyId: replyId ?? null, reporterUserId: userId, reason, targetKey: `${replyId ? "reply" : "post"}:${replyId ?? id}` }).onConflictDoNothing()
    return { received: true }
  })
}
export async function deleteForumContent(userId: string, id: string, replyId?: string) {
  const db = await database()
  return db.transaction(async tx => {
    await activeUser(tx, userId); const post = await lockedPost(tx, id, false)
    const [reply] = replyId ? await tx.select().from(forumReplies).where(and(eq(forumReplies.id, replyId), eq(forumReplies.postId, id), isNull(forumReplies.deletedAt))).for("update").limit(1) : []
    const target = replyId ? reply : post
    if (!target) throw new ForumError(404, "内容不存在")
    if (target.authorUserId !== userId) throw new ForumError(403, "只能删除自己的内容")
    const now = new Date()
    if (replyId) await tx.update(forumReplies).set({ status: "deleted", deletedAt: now, content: "内容已由作者删除" }).where(eq(forumReplies.id, replyId))
    else await tx.update(forumPosts).set({ status: "deleted", deletedAt: now, updatedAt: now, title: "内容已删除", content: "此内容已由作者删除，不再公开。" }).where(eq(forumPosts.id, id))
    await tx.update(forumReports).set({ resolvedAt: now }).where(and(eq(forumReports.postId, id), replyId ? eq(forumReports.replyId, replyId) : undefined, isNull(forumReports.resolvedAt)))
    await tx.insert(forumModerationEvents).values({ postId: id, replyId: replyId ?? null, actorUserId: userId, fromStatus: target.status, toStatus: "deleted", reason: "author_deleted" })
    return { deleted: true }
  })
}

export type ForumQueueItem = { kind: "post" | "reply"; id: string; postId: string; companyName: string; title: string; content: string; status: string; reason?: string }
export async function getForumQueue() {
  const db = await database()
  const [posts, replies, reports] = await Promise.all([
    db.select({ post: forumPosts, name: companies.name }).from(forumPosts).innerJoin(companies, eq(companies.id, forumPosts.companyId))
      .where(and(eq(forumPosts.status, "pending_review"), isNull(forumPosts.deletedAt))).orderBy(asc(forumPosts.createdAt)).limit(20),
    db.select({ reply: forumReplies, post: forumPosts, name: companies.name }).from(forumReplies).innerJoin(forumPosts, eq(forumPosts.id, forumReplies.postId)).innerJoin(companies, eq(companies.id, forumPosts.companyId))
      .where(and(eq(forumReplies.status, "pending_review"), isNull(forumReplies.deletedAt), isNull(forumPosts.deletedAt))).orderBy(asc(forumReplies.createdAt)).limit(20),
    db.select({ report: forumReports, reply: forumReplies, post: forumPosts, name: companies.name }).from(forumReports).innerJoin(forumPosts, eq(forumPosts.id, forumReports.postId))
      .innerJoin(companies, eq(companies.id, forumPosts.companyId)).leftJoin(forumReplies, eq(forumReplies.id, forumReports.replyId))
      .where(and(isNull(forumReports.resolvedAt), isNull(forumPosts.deletedAt))).orderBy(asc(forumReports.createdAt)).limit(20),
  ])
  const pending: ForumQueueItem[] = [
    ...posts.map(({ post, name }) => ({ kind: "post" as const, id: post.id, postId: post.id, companyName: name, title: post.title, content: post.content, status: post.status })),
    ...replies.map(({ reply, post, name }) => ({ kind: "reply" as const, id: reply.id, postId: post.id, companyName: name, title: post.title, content: reply.content, status: reply.status })),
  ]
  const reported: ForumQueueItem[] = reports.map(({ report, reply, post, name }) => ({ kind: report.replyId ? "reply" : "post", id: report.replyId ?? post.id,
    postId: post.id, companyName: name, title: post.title, content: report.replyId ? reply?.content ?? "已删除" : post.content, status: reply?.status ?? post.status, reason: report.reason }))
  return { pending, reported }
}
export async function moderateForum(moderator: string, data: { kind: "post" | "reply"; id: string; postId: string; status: "visible" | "hidden" | "rejected"; expectedStatus: string; reason: string }) {
  const db = await database()
  return db.transaction(async tx => {
    await activeUser(tx, moderator, true); const post = await lockedPost(tx, data.postId, data.status === "visible")
    const [reply] = data.kind === "reply" ? await tx.select().from(forumReplies).where(and(eq(forumReplies.id, data.id), eq(forumReplies.postId, post.id), isNull(forumReplies.deletedAt))).for("update").limit(1) : []
    if (data.kind === "post" && data.id !== post.id) throw new ForumError(400, "帖子编号不一致")
    const target = data.kind === "reply" ? reply : post
    if (!target) throw new ForumError(404, "内容不存在")
    if (target.status !== data.expectedStatus) throw new ForumError(409, "内容状态已变化，请刷新队列")
    // A hidden parent must prevent publishing replies, but must not prevent a
    // moderator from resolving an existing privacy/spam report on its replies.
    if (data.kind === "reply" && data.status === "visible" && post.status !== "visible") throw new ForumError(409, "请先审核公开主帖")
    if (!["pending_review", "visible", "hidden", "rejected"].includes(target.status)) throw new ForumError(409, "内容状态已变化")
    if (data.kind === "reply") await tx.update(forumReplies).set({ status: data.status }).where(eq(forumReplies.id, data.id))
    else await tx.update(forumPosts).set({ status: data.status, updatedAt: new Date() }).where(eq(forumPosts.id, data.id))
    await tx.insert(forumModerationEvents).values({ postId: post.id, replyId: data.kind === "reply" ? data.id : null, actorUserId: moderator,
      fromStatus: target.status, toStatus: data.status, reason: data.reason })
    await tx.update(forumReports).set({ resolvedAt: new Date() }).where(and(eq(forumReports.postId, post.id),
      data.kind === "reply" ? eq(forumReports.replyId, data.id) : isNull(forumReports.replyId), isNull(forumReports.resolvedAt)))
    return { id: data.id, status: data.status }
  })
}
