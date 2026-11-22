import { randomUUID } from "node:crypto"
import { and, eq, inArray } from "drizzle-orm"
import { expect, test } from "../database-fixture"
import { db } from "../../src/db/client"
import { users } from "../../src/db/schema/users"
import { dialogueSessions, dialogueApplications, dialogueAuditEvents } from "../../src/db/schema/dialogues"
import { createDialogue, manageDialogue, getDialogues, getDialogue, applyForDialogue, withdrawDialogue, getMyDialogues, getDialogueApplications, getDialogueManagement, decideDialogue } from "../../src/lib/server/dialogue-service"

const userIds: string[] = [], sessionIds: string[] = []
let previousFlag: string | undefined
test.beforeEach(() => { previousFlag = process.env.NEXT_PUBLIC_DIALOGUE_ENABLED; process.env.NEXT_PUBLIC_DIALOGUE_ENABLED = "true" })
test.afterEach(async () => {
  if (sessionIds.length) await db.delete(dialogueSessions).where(inArray(dialogueSessions.id, sessionIds))
  if (userIds.length) await db.delete(users).where(inArray(users.id, userIds))
  sessionIds.length = userIds.length = 0
  if (previousFlag === undefined) delete process.env.NEXT_PUBLIC_DIALOGUE_ENABLED; else process.env.NEXT_PUBLIC_DIALOGUE_ENABLED = previousFlag
})
async function fixture() {
  const people = await db.insert(users).values(["user", "user", "moderator", "moderator"].map((role, i) => ({ email: `${randomUUID()}@dialogue.test`, displayName: `隔离报名者${i}`, role: role as "user" | "moderator" }))).returning()
  userIds.push(...people.map(person => person.id))
  const [first, second, moderator, otherModerator] = people
  const data = { requestId: randomUUID(), title: `隔离对话 ${randomUUID()}`, description: "围绕跨团队协作和工作节奏做一次真实经历交流，不涉及收款。", guestName: "隔离测试嘉宾", guestBio: "在测试中用于验证嘉宾介绍的公开边界。", companyId: null, durationMinutes: 45, capacity: 1, startsAt: new Date(Date.now() + 4 * 86400_000).toISOString(), signupEndsAt: new Date(Date.now() + 2 * 86400_000).toISOString(), fundingMode: "undecided" as const, guestConsentConfirmed: true }
  const event = await createDialogue(moderator.id, data); sessionIds.push(event.id)
  return { first, second, moderator, otherModerator, data, event }
}
test("drafts require consent and moderator role; public views never expose applicants or private arrangements", async () => {
  const f = await fixture()
  await expect(createDialogue(f.first.id, { ...f.data, requestId: randomUUID() })).rejects.toMatchObject({ status: 403 })
  await expect(getDialogue(f.event.id)).rejects.toMatchObject({ status: 404 })
  await expect(getDialogueManagement(f.first.id)).rejects.toMatchObject({ status: 403 })
  await db.update(dialogueSessions).set({ guestConsentConfirmed: false }).where(eq(dialogueSessions.id, f.event.id))
  await expect(manageDialogue(f.moderator.id, f.event.id, { action: "publish" })).rejects.toMatchObject({ status: 409 })
  await db.update(dialogueSessions).set({ guestConsentConfirmed: true }).where(eq(dialogueSessions.id, f.event.id))
  await manageDialogue(f.moderator.id, f.event.id, { action: "publish" })
  await manageDialogue(f.moderator.id, f.event.id, { action: "arrangements", privateInstructions: "私密会议加入方式 PRIVATE-MEETING" })
  const application = await applyForDialogue(f.first.id, f.event.id, { question: "仅报名者与管理者可见的问题 PRIVATE-QUESTION", requestId: randomUUID() })
  const publicJson = JSON.stringify(await getDialogue(f.event.id))
  for (const value of ["PRIVATE-MEETING", "PRIVATE-QUESTION", f.first.id, f.first.email!, f.moderator.id, "createdBy", "requestId", "privateInstructions"]) expect(publicJson).not.toContain(value)
  expect(JSON.parse(publicJson)).toMatchObject({ paymentsEnabled: false, biddingEnabled: false, donationStatus: "not_started" })
  expect((await getMyDialogues(f.second.id)).applications).toEqual([])
  expect((await getMyDialogues(f.first.id)).applications[0].privateInstructions).toBeNull()
  await expect(getDialogueApplications(f.first.id, f.event.id)).rejects.toMatchObject({ status: 403 })
  await decideDialogue(f.moderator.id, f.event.id, application.id, { status: "selected", expectedStatus: "submitted", reason: "访谈问题适合本场讨论" })
  expect((await getMyDialogues(f.first.id)).applications[0].privateInstructions).toContain("PRIVATE-MEETING")
  await manageDialogue(f.moderator.id, f.event.id, { action: "hide", reason: "重新核对活动资料" })
  await expect(getDialogue(f.event.id)).rejects.toMatchObject({ status: 404 })
  expect((await getMyDialogues(f.first.id)).applications[0]).toMatchObject({ sessionTitle: "活动暂不可见", privateInstructions: null })
})
test("create/apply are idempotent; withdrawal clears private questions and cannot be replayed as a new application", async () => {
  const f = await fixture()
  expect((await createDialogue(f.moderator.id, f.data)).id).toBe(f.event.id)
  await expect(createDialogue(f.moderator.id, { ...f.data, title: "同一请求换了标题" })).rejects.toMatchObject({ status: 409 })
  await manageDialogue(f.moderator.id, f.event.id, { action: "publish" })
  const input = { question: "希望了解团队内部如何安排跨项目协作？", requestId: randomUUID() }
  const repeated = await Promise.all([applyForDialogue(f.first.id, f.event.id, input), applyForDialogue(f.first.id, f.event.id, input)])
  expect(repeated[0].id).toBe(repeated[1].id)
  await expect(applyForDialogue(f.first.id, f.event.id, { ...input, question: "同一请求的内容发生了变化，需要拒绝？" })).rejects.toMatchObject({ status: 409 })
  await expect(withdrawDialogue(f.second.id, repeated[0].id)).rejects.toMatchObject({ status: 404 })
  await withdrawDialogue(f.first.id, repeated[0].id)
  expect((await db.select().from(dialogueApplications).where(eq(dialogueApplications.id, repeated[0].id)))[0]).toMatchObject({ status: "withdrawn", question: "", decisionNote: null })
  expect((await applyForDialogue(f.first.id, f.event.id, input)).status).toBe("withdrawn")
  expect((await applyForDialogue(f.first.id, f.event.id, { ...input, requestId: randomUUID() })).status).toBe("submitted")
  const audit = await db.select().from(dialogueAuditEvents).where(eq(dialogueAuditEvents.sessionId, f.event.id))
  expect(JSON.stringify(audit)).not.toContain(input.question)
})
test("different moderators cannot oversubscribe capacity and stale decisions cannot select withdrawn applications", async () => {
  const f = await fixture(); await manageDialogue(f.moderator.id, f.event.id, { action: "publish" })
  const a = await applyForDialogue(f.first.id, f.event.id, { question: "想了解真实的项目沟通和协作方式？", requestId: randomUUID() })
  const b = await applyForDialogue(f.second.id, f.event.id, { question: "想了解真实的职业发展与团队分工？", requestId: randomUUID() })
  const decisions = await Promise.allSettled([decideDialogue(f.moderator.id, f.event.id, a.id, { status: "selected", expectedStatus: "submitted", reason: "适合本场交流" }), decideDialogue(f.otherModerator.id, f.event.id, b.id, { status: "selected", expectedStatus: "submitted", reason: "适合本场交流" })])
  expect(decisions.filter(result => result.status === "fulfilled")).toHaveLength(1)
  expect(await db.select().from(dialogueApplications).where(and(eq(dialogueApplications.sessionId, f.event.id), eq(dialogueApplications.status, "selected")))).toHaveLength(1)
  await withdrawDialogue(f.first.id, a.id); await withdrawDialogue(f.second.id, b.id)
  await expect(decideDialogue(f.moderator.id, f.event.id, a.id, { status: "selected", expectedStatus: "submitted", reason: "不能选择已撤回报名" })).rejects.toMatchObject({ status: 409 })
})
test("closed/expired sessions reject applications and recaps require elapsed activity plus explicit consent", async () => {
  const f = await fixture(); await manageDialogue(f.moderator.id, f.event.id, { action: "publish" })
  await manageDialogue(f.moderator.id, f.event.id, { action: "close" })
  await expect(applyForDialogue(f.first.id, f.event.id, { question: "报名截止后不能再提交这个问题？", requestId: randomUUID() })).rejects.toMatchObject({ status: 409 })
  await expect(manageDialogue(f.moderator.id, f.event.id, { action: "complete", recap: "", recapConsentConfirmed: false })).rejects.toMatchObject({ status: 409 })
  await db.update(dialogueSessions).set({ startsAt: new Date(Date.now() - 2 * 86400_000), signupEndsAt: new Date(Date.now() - 3 * 86400_000) }).where(eq(dialogueSessions.id, f.event.id))
  await expect(manageDialogue(f.moderator.id, f.event.id, { action: "complete", recap: "未经授权的公开纪要", recapConsentConfirmed: false })).rejects.toMatchObject({ status: 400 })
  await manageDialogue(f.moderator.id, f.event.id, { action: "complete", recap: "经过授权整理的协作经验纪要。", recapConsentConfirmed: true })
  expect((await getDialogue(f.event.id)).recap).toBe("经过授权整理的协作经验纪要。")
})
test("pagination is scoped, complete with tied timestamps, and drafts never appear in public lists", async () => {
  const f = await fixture()
  await manageDialogue(f.moderator.id, f.event.id, { action: "publish" })
  const at = new Date(), ids = []
  for (let i = 0; i < 22; i++) ids.push({ ...f.data, requestId: randomUUID(), title: `分页对话测试 ${i}`, createdBy: f.moderator.id, startsAt: new Date(f.data.startsAt), signupEndsAt: new Date(f.data.signupEndsAt), status: "open", guestConsentConfirmed: true, publishedAt: at, createdAt: at })
  const inserted = await db.insert(dialogueSessions).values(ids).returning({ id: dialogueSessions.id }); sessionIds.push(...inserted.map(row => row.id))
  const first = await getDialogues(), second = await getDialogues(undefined, first.nextCursor!)
  for (const row of inserted) expect([...first.sessions, ...second.sessions].some(session => session.id === row.id)).toBe(true)
  expect(new Set([...first.sessions, ...second.sessions].map(row => row.id)).size).toBe(first.sessions.length + second.sessions.length)
  await expect(getDialogueManagement(f.moderator.id, first.nextCursor!)).rejects.toMatchObject({ status: 400 })
  const cancelled = await createDialogue(f.moderator.id, { ...f.data, requestId: randomUUID() }); sessionIds.push(cancelled.id)
  await manageDialogue(f.moderator.id, cancelled.id, { action: "cancel", reason: "活动未获确认" })
  await expect(getDialogue(cancelled.id)).rejects.toMatchObject({ status: 404 })
})
