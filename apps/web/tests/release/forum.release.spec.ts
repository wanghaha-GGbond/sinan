import { randomUUID } from "node:crypto"
import { eq, inArray } from "drizzle-orm"
import { expect, test } from "../release-fixture"
import { db } from "../../src/db/client"
import { companies } from "../../src/db/schema/companies"
import { users } from "../../src/db/schema/users"
import { forumPosts, forumReplies, forumVotes, forumFollows, forumReports } from "../../src/db/schema/forum"
import { signToken } from "../../src/lib/server/auth"

let companyId = "", ownerId = "", readerId = "", moderatorId = ""
test.beforeAll(async () => {
  const [c] = await db.insert(companies).values({ name: `Forum E2E ${randomUUID()}`, city: "上海", industry: "软件", reviewStatus: "reviewable" }).returning()
  companyId = c.id
  const people = await db.insert(users).values(["owner", "reader", "moderator"].map((role, i) => ({ email: `${randomUUID()}@forum.test`, displayName: role, role: i === 2 ? "moderator" as const : "user" as const }))).returning()
  ;[ownerId, readerId, moderatorId] = people.map(p => p.id)
})
test.afterAll(async () => {
  if (companyId) {
    await db.delete(forumPosts).where(eq(forumPosts.companyId, companyId))
    await db.delete(forumFollows).where(eq(forumFollows.companyId, companyId))
    await db.delete(companies).where(eq(companies.id, companyId))
  }
  if (ownerId) await db.delete(users).where(inArray(users.id, [ownerId, readerId, moderatorId]))
})
test("real forum story: browser submits, moderation publishes, reply/follow/vote and deletion persist", async ({ page, request, baseURL }) => {
  if (process.env.DATABASE_ADAPTER === "neon") test.setTimeout(180_000)
  const ownerToken = await signToken({ userId: ownerId, role: "user" }), readerToken = await signToken({ userId: readerId, role: "user" }), modToken = await signToken({ userId: moderatorId, role: "moderator" })
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` })
  await page.context().addCookies([{ name: "auth_token", value: ownerToken, url: baseURL! }])
  await page.goto(`/company/${companyId}/community`)
  await page.locator("#forum-composer summary").click()
  await page.getByLabel("标题", { exact: true }).fill("面试前想了解团队的协作方式")
  await page.getByLabel("正文", { exact: true }).fill("大家通常如何安排跨团队需求评审，希望听听具体的工作经历。")
  await page.getByRole("button", { name: "提交帖子" }).click()
  await expect(page).toHaveURL(/\/community\/[a-f0-9-]{36}$/)
  await expect(page.getByText("已提交，等待审核", { exact: false })).toBeVisible()
  const id = new URL(page.url()).pathname.split("/").at(-1)!
  expect((await request.get(`/api/forum/posts/${id}`, { headers: headers(readerToken) })).status()).toBe(404)
  const [stored] = await db.select().from(forumPosts).where(eq(forumPosts.id, id))
  expect(stored.authorUserId).toBe(ownerId); expect(stored.status).toBe("pending_review")
  expect((await request.patch("/api/moderation/forum", { headers: headers(readerToken), data: { kind: "post", id, postId: id, status: "visible", expectedStatus: "pending_review", reason: "隔离审核" } })).status()).toBe(403)
  expect((await request.patch("/api/moderation/forum", { headers: headers(modToken), data: { kind: "post", id, postId: id, status: "visible", expectedStatus: "pending_review", reason: "隔离审核" } })).status()).toBe(200)
  await page.reload(); await expect(page.getByLabel("写回复")).toBeVisible()
  await page.getByLabel("写回复").fill("通常按项目进行评审，也会安排定期的跨团队同步。")
  await page.getByRole("button", { name: "提交回复" }).click(); await expect(page.getByText("回复已提交", { exact: true })).toBeVisible()
  const [reply] = await db.select().from(forumReplies).where(eq(forumReplies.postId, id))
  expect(reply.status).toBe("pending_review")
  expect((await request.get(`/api/forum/posts/${id}`, { headers: headers(readerToken) }).then(r => r.json())).replies).toHaveLength(0)
  expect((await request.patch("/api/moderation/forum", { headers: headers(modToken), data: { kind: "reply", id: reply.id, postId: id, status: "visible", expectedStatus: "pending_review", reason: "回复审核" } })).status()).toBe(200)
  expect((await request.put("/api/forum/follows", { headers: headers(readerToken), data: { companyId, following: true } })).status()).toBe(200)
  const following = await request.get(`/api/forum/posts?feed=following&companyId=${companyId}`, { headers: headers(readerToken) }).then(r => r.json())
  expect(following.posts.map((p: { id: string }) => p.id)).toContain(id)
  for (let i = 0; i < 2; i++) expect((await request.put(`/api/forum/posts/${id}/useful`, { headers: headers(readerToken), data: { useful: true } }).then(r => r.json())).usefulCount).toBe(1)
  expect((await request.post(`/api/forum/posts/${id}/report`, { headers: headers(readerToken), data: { reason: "other" } })).status()).toBe(201)
  const publicItem = await request.get(`/api/forum/posts/${id}`, { headers: headers(readerToken) }).then(r => r.json())
  expect(publicItem.replies).toHaveLength(1)
  for (const key of ["authorUserId", ownerId, "@forum.test", "requestId"]) expect(JSON.stringify(publicItem)).not.toContain(key)
  const publicReplyResponse = await request.post(`/api/forum/posts/${id}/replies`, { headers: headers(readerToken), data: { content: "我也希望了解这方面的实际经验。", requestId: randomUUID() } })
  expect(publicReplyResponse.status()).toBe(201)
  const publicReply = (await publicReplyResponse.json()).reply
  expect((await request.patch("/api/moderation/forum", { headers: headers(modToken), data: { kind: "reply", id: publicReply.id, postId: id, status: "visible", expectedStatus: "pending_review", reason: "回复审核" } })).status()).toBe(200)
  // The same real deletion route used by users must remove private linkage,
  // follows/votes/reports and private drafts, without losing public content.
  await db.insert(forumPosts).values({ companyId, authorUserId: readerId, category: "career", title: "本人未公开的草稿", content: "这是不应该在注销之后保留的私有内容。" })
  expect((await request.delete("/api/me/account", { headers: headers(readerToken), data: { confirmation: "DELETE" } })).status()).toBe(200)
  expect(await db.select().from(forumVotes).where(eq(forumVotes.userId, readerId))).toHaveLength(0)
  expect(await db.select().from(forumFollows).where(eq(forumFollows.userId, readerId))).toHaveLength(0)
  expect(await db.select().from(forumReports).where(eq(forumReports.reporterUserId, readerId))).toHaveLength(0)
  expect(await db.select().from(forumPosts).where(eq(forumPosts.authorUserId, readerId))).toHaveLength(0)
  const [anonymizedReply] = await db.select().from(forumReplies).where(eq(forumReplies.id, publicReply.id))
  expect(anonymizedReply.authorUserId).toBeNull(); expect(anonymizedReply.status).toBe("visible")
  expect((await request.get(`/api/forum/posts/${id}`)).status()).toBe(200)
  await page.reload(); await page.getByRole("button", { name: "删除帖子" }).click({ trial: true })
  page.once("dialog", d => d.accept())
  await page.getByRole("button", { name: "删除帖子" }).click()
  await expect(page).toHaveURL(/\/community\?feed=mine$/)
  expect((await request.get(`/api/forum/posts/${id}`)).status()).toBe(404)
})
