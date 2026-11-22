import { and, desc, eq, isNotNull, isNull, lt, or, sql } from "drizzle-orm"
import { dialogueSessions as sessions, dialogueApplications as applications, dialogueAuditEvents as audits } from "@/db/schema/dialogues"
import { users } from "@/db/schema/users"
import { companies } from "@/db/schema/companies"
import { hasSensitive } from "@/lib/content-guard"
import { DialogueError, dialogueCursor, parseDialogueCursor, dialogueMoneyPolicy, type DialogueDraft, type DialogueAction, type DialogueDecision, type DialogueSession, type DialogueApplication, type ApplicationStatus, type DialogueStatus } from "@/lib/dialogue"
import { ensureDialogueEnabled } from "./dialogue-http"

type Database = typeof import("@/db/client").db
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0]
type Session = typeof sessions.$inferSelect
type Application = typeof applications.$inferSelect
async function database() {
  ensureDialogueEnabled()
  if (!process.env.DATABASE_URL) throw new DialogueError(503, "对话活动暂时不可用，请稍后重试")
  return (await import("@/db/client")).db
}
async function actor(tx: Tx, id: string, moderator = false) {
  const [user] = await tx.select({ role: users.role }).from(users).where(and(eq(users.id, id), eq(users.status, "active"), isNull(users.deletedAt))).for("update").limit(1)
  if (!user) throw new DialogueError(401, "请重新登录")
  if (moderator && !["admin", "moderator"].includes(user.role)) throw new DialogueError(403, "没有活动管理权限")
}
function cleanPublicText(value: string) { if (hasSensitive(value)) throw new DialogueError(400, "请移除联系方式或身份信息") }
async function checkCompany(db: Database | Tx, id: string | null) {
  if (!id) return
  const [company] = await db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, id), eq(companies.reviewStatus, "reviewable"), isNull(companies.deletedAt))).limit(1)
  if (!company) throw new DialogueError(404, "公司暂不可用")
}
const companyVisible = or(isNull(sessions.companyId), and(eq(companies.reviewStatus, "reviewable"), isNull(companies.deletedAt)))!
const visible = and(isNotNull(sessions.publishedAt), sql`${sessions.status} NOT IN ('draft','hidden')`, companyVisible)!
function view(row: Session, companyName: string | null): DialogueSession {
  return { id: row.id, title: row.title, description: row.description, guestName: row.guestName, guestBio: row.guestBio,
    companyId: row.companyId, companyName, durationMinutes: row.durationMinutes, capacity: row.capacity,
    startsAt: row.startsAt.toISOString(), signupEndsAt: row.signupEndsAt.toISOString(), fundingMode: row.fundingMode as DialogueSession["fundingMode"],
    status: row.status as DialogueStatus, recap: row.status === "completed" && row.recapConsentConfirmed ? row.recap : "",
    cancelReason: row.status === "cancelled" ? row.cancelReason : null, createdAt: row.createdAt.toISOString(), ...dialogueMoneyPolicy }
}
function applicationView(row: Application): DialogueApplication {
  return { id: row.id, sessionId: row.sessionId, question: row.status === "withdrawn" ? "" : row.question, status: row.status as ApplicationStatus, decisionNote: row.decisionNote, createdAt: row.createdAt.toISOString() }
}
function pagePosition(table: typeof sessions | typeof applications, cursor: ReturnType<typeof parseDialogueCursor>) {
  return cursor ? or(lt(table.createdAt, cursor.date), and(eq(table.createdAt, cursor.date), lt(table.id, cursor.id))) : undefined
}
async function lockedSession(tx: Tx, id: string) {
  const [row] = await tx.select().from(sessions).where(eq(sessions.id, id)).for("update").limit(1)
  if (!row) throw new DialogueError(404, "活动不存在")
  return row
}
function audit(tx: Tx, sessionId: string, actorUserId: string, action: string, fromStatus: string | null, toStatus: string | null, reason = "", applicationId?: string) {
  return tx.insert(audits).values({ sessionId, actorUserId, action, fromStatus, toStatus, reason, applicationId })
}
export async function getDialogues(companyId?: string, cursor?: string) {
  const scope = `public:${companyId ?? "all"}`, position = parseDialogueCursor(scope, cursor), db = await database()
  const rows = await db.select({ row: sessions, companyName: companies.name }).from(sessions).leftJoin(companies, eq(companies.id, sessions.companyId))
    .where(and(visible, companyId ? eq(sessions.companyId, companyId) : undefined, pagePosition(sessions, position))).orderBy(desc(sessions.createdAt), desc(sessions.id)).limit(21)
  const page = rows.slice(0, 20), last = page.at(-1)
  return { sessions: page.map(r => view(r.row, r.companyName)), nextCursor: rows.length > 20 && last ? dialogueCursor(scope, last.row) : null }
}
export async function getDialogue(id: string) {
  const db = await database()
  const [item] = await db.select({ row: sessions, companyName: companies.name }).from(sessions).leftJoin(companies, eq(companies.id, sessions.companyId)).where(and(eq(sessions.id, id), visible)).limit(1)
  if (!item) throw new DialogueError(404, "活动不存在或暂不可见")
  return view(item.row, item.companyName)
}
export async function createDialogue(userId: string, data: DialogueDraft) {
  cleanPublicText([data.title, data.description, data.guestName, data.guestBio].join("\n"))
  const db = await database()
  return db.transaction(async tx => {
    await actor(tx, userId, true); await checkCompany(tx, data.companyId)
    const [existing] = await tx.select().from(sessions).where(and(eq(sessions.createdBy, userId), eq(sessions.requestId, data.requestId))).limit(1)
    if (existing) {
      const same = existing.title === data.title && existing.description === data.description && existing.guestName === data.guestName && existing.guestBio === data.guestBio && existing.companyId === data.companyId && existing.durationMinutes === data.durationMinutes && existing.capacity === data.capacity && existing.startsAt.getTime() === Date.parse(data.startsAt) && existing.signupEndsAt.getTime() === Date.parse(data.signupEndsAt) && existing.fundingMode === data.fundingMode && existing.guestConsentConfirmed === data.guestConsentConfirmed
      if (!same) throw new DialogueError(409, "重复请求内容不一致，请刷新后重试")
      return { id: existing.id, status: existing.status }
    }
    const [row] = await tx.insert(sessions).values({ ...data, startsAt: new Date(data.startsAt), signupEndsAt: new Date(data.signupEndsAt), createdBy: userId }).returning()
    await audit(tx, row.id, userId, "create", null, "draft")
    return { id: row.id, status: row.status }
  })
}
export async function manageDialogue(userId: string, id: string, action: DialogueAction) {
  const db = await database()
  return db.transaction(async tx => {
    await actor(tx, userId, true)
    const row = await lockedSession(tx, id), now = new Date()
    const patch: Partial<typeof sessions.$inferInsert> = { updatedAt: now }
    if (action.action === "publish") {
      if (row.status !== "draft" || !row.guestConsentConfirmed || row.signupEndsAt <= now) throw new DialogueError(409, "请确认嘉宾授权和有效的报名时间后发布")
      await checkCompany(tx, row.companyId); patch.status = "open"; patch.publishedAt = now
    } else if (action.action === "close") {
      if (row.status !== "open") throw new DialogueError(409, "活动当前不可结束报名")
      patch.status = "closed"
    } else if (action.action === "cancel") {
      if (!["draft", "open", "closed"].includes(row.status)) throw new DialogueError(409, "活动当前不可取消")
      cleanPublicText(action.reason); patch.status = "cancelled"; patch.cancelReason = action.reason; patch.privateInstructions = ""
    } else if (action.action === "hide") {
      if (!row.publishedAt || row.status === "hidden") throw new DialogueError(409, "活动当前不可隐藏")
      patch.status = "hidden"; patch.privateInstructions = ""
    } else if (action.action === "arrangements") {
      if (!["open", "closed"].includes(row.status)) throw new DialogueError(409, "活动当前不可更新参与安排")
      patch.privateInstructions = action.privateInstructions
    } else {
      if (row.status !== "closed" || row.startsAt.getTime() + row.durationMinutes * 60_000 > now.getTime()) throw new DialogueError(409, "活动实际结束后才能完成并发布纪要")
      if (action.recap && !action.recapConsentConfirmed) throw new DialogueError(400, "公开纪要需要相关参与者授权")
      cleanPublicText(action.recap); patch.status = "completed"; patch.recap = action.recap; patch.recapConsentConfirmed = action.recapConsentConfirmed; patch.privateInstructions = ""
    }
    await tx.update(sessions).set(patch).where(eq(sessions.id, id))
    await audit(tx, id, userId, action.action, row.status, patch.status ?? row.status, "reason" in action ? action.reason : "")
    return { id, status: patch.status ?? row.status }
  })
}
export async function applyForDialogue(userId: string, id: string, data: { question: string; requestId: string }) {
  cleanPublicText(data.question)
  const db = await database()
  return db.transaction(async tx => {
    await actor(tx, userId)
    const session = await lockedSession(tx, id), now = new Date()
    if (session.status !== "open" || !session.publishedAt || session.signupEndsAt <= now || session.startsAt <= now) throw new DialogueError(409, "报名已结束或活动暂不可报名")
    await checkCompany(tx, session.companyId)
    const [existing] = await tx.select().from(applications).where(and(eq(applications.sessionId, id), eq(applications.userId, userId))).for("update").limit(1)
    if (existing?.requestId === data.requestId) {
      if (existing.status !== "withdrawn" && existing.question !== data.question) throw new DialogueError(409, "重复请求内容不一致，请刷新后重试")
      return applicationView(existing)
    }
    if (existing && existing.status !== "withdrawn") throw new DialogueError(409, "已经报名，请先查看或撤回原报名")
    const values = { ...data, status: "submitted", decisionNote: null, updatedAt: now }
    const [row] = existing
      ? await tx.update(applications).set(values).where(eq(applications.id, existing.id)).returning()
      : await tx.insert(applications).values({ ...values, sessionId: id, userId }).returning()
    await audit(tx, id, userId, "apply", existing?.status ?? null, "submitted", "", row.id)
    return applicationView(row)
  })
}
export async function withdrawDialogue(userId: string, id: string) {
  const db = await database()
  return db.transaction(async tx => {
    await actor(tx, userId)
    const [found] = await tx.select({ sessionId: applications.sessionId }).from(applications).where(and(eq(applications.id, id), eq(applications.userId, userId))).limit(1)
    if (!found) throw new DialogueError(404, "报名不存在")
    await lockedSession(tx, found.sessionId)
    const [row] = await tx.select().from(applications).where(and(eq(applications.id, id), eq(applications.userId, userId))).for("update").limit(1)
    if (!row) throw new DialogueError(404, "报名不存在")
    if (row.status !== "withdrawn") {
      await tx.update(applications).set({ status: "withdrawn", question: "", decisionNote: null, updatedAt: new Date() }).where(eq(applications.id, id))
      await audit(tx, row.sessionId, userId, "withdraw", row.status, "withdrawn", "", id)
    }
    return { id, status: "withdrawn" as const }
  })
}
export async function getMyDialogues(userId: string, cursor?: string) {
  const scope = `mine:${userId}`, position = parseDialogueCursor(scope, cursor), db = await database()
  const rows = await db.select({ row: applications, session: sessions }).from(applications).innerJoin(sessions, eq(sessions.id, applications.sessionId))
    .innerJoin(users, eq(users.id, applications.userId)).where(and(eq(applications.userId, userId), eq(users.status, "active"), isNull(users.deletedAt), pagePosition(applications, position)))
    .orderBy(desc(applications.createdAt), desc(applications.id)).limit(21)
  const page = rows.slice(0, 20), last = page.at(-1)
  return { applications: page.map(({ row, session }) => ({ ...applicationView(row), sessionTitle: session.status === "hidden" ? "活动暂不可见" : session.title, sessionStatus: session.status as DialogueStatus,
    startsAt: session.startsAt.toISOString(), privateInstructions: row.status === "selected" && ["open", "closed"].includes(session.status) ? session.privateInstructions || null : null })),
    nextCursor: rows.length > 20 && last ? dialogueCursor(scope, last.row) : null }
}
export async function getDialogueManagement(userId: string, cursor?: string) {
  const position = parseDialogueCursor("admin", cursor), db = await database()
  return db.transaction(async tx => {
    await actor(tx, userId, true)
    const rows = await tx.select({ row: sessions, companyName: companies.name }).from(sessions).leftJoin(companies, eq(companies.id, sessions.companyId))
      .where(pagePosition(sessions, position)).orderBy(desc(sessions.createdAt), desc(sessions.id)).limit(21)
    const page = rows.slice(0, 20), last = page.at(-1)
    return { sessions: page.map(({ row, companyName }) => ({ ...view(row, companyName), guestConsentConfirmed: row.guestConsentConfirmed, privateInstructions: row.privateInstructions })),
      nextCursor: rows.length > 20 && last ? dialogueCursor("admin", last.row) : null }
  })
}
export async function getDialogueApplications(userId: string, id: string, cursor?: string) {
  const scope = `queue:${id}`, position = parseDialogueCursor(scope, cursor), db = await database()
  return db.transaction(async tx => {
    await actor(tx, userId, true); await lockedSession(tx, id)
    const rows = await tx.select().from(applications).where(and(eq(applications.sessionId, id), pagePosition(applications, position))).orderBy(desc(applications.createdAt), desc(applications.id)).limit(21)
    const page = rows.slice(0, 20), last = page.at(-1)
    return { applications: page.map(applicationView), nextCursor: rows.length > 20 && last ? dialogueCursor(scope, last) : null }
  })
}
export async function decideDialogue(userId: string, id: string, applicationId: string, decision: DialogueDecision) {
  cleanPublicText(decision.reason)
  const db = await database()
  return db.transaction(async tx => {
    await actor(tx, userId, true)
    const session = await lockedSession(tx, id)
    if (!["open", "closed"].includes(session.status) || session.startsAt <= new Date()) throw new DialogueError(409, "活动已结束，不能变更入选结果")
    const [row] = await tx.select().from(applications).where(and(eq(applications.id, applicationId), eq(applications.sessionId, id))).for("update").limit(1)
    if (!row) throw new DialogueError(404, "报名不存在")
    if (row.status !== decision.expectedStatus) throw new DialogueError(409, "报名状态已变化，请刷新")
    if (decision.status === "selected" && row.status !== "selected") {
      const [count] = await tx.select({ count: sql<number>`count(*)::int` }).from(applications).where(and(eq(applications.sessionId, id), eq(applications.status, "selected")))
      if (count.count >= session.capacity) throw new DialogueError(409, "活动名额已满")
    }
    await tx.update(applications).set({ status: decision.status, decisionNote: decision.reason, updatedAt: new Date() }).where(eq(applications.id, applicationId))
    // Keep the private explanation only on the application so withdrawal and
    // account deletion can actually erase it; audit only the state transition.
    await audit(tx, id, userId, "decide", row.status, decision.status, "", applicationId)
    return { id: applicationId, status: decision.status }
  })
}
