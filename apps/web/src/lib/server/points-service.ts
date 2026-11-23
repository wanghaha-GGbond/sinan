import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import { users } from "@/db/schema/users"
import { companies } from "@/db/schema/companies"
import { dialogueApplications as applications, dialogueSessions as sessions, dialogueAuditEvents as audits } from "@/db/schema/dialogues"
import { pointAccounts as accounts, pointEntries as entries } from "@/db/schema/points"
import { DialogueError, type DialogueApplication } from "@/lib/dialogue"
import { POINTS_LIMIT, pointBidInput, pointGrantInput, pointsPolicy, pointTaskKey, pointTasks, type PointsWallet } from "@/lib/points"
import { hasSensitive } from "@/lib/content-guard"
import { ensurePointsEnabled } from "./points-feature"

type Database = typeof import("@/db/client").db
export type PointsTx = Parameters<Parameters<Database["transaction"]>[0]>[0]
// Beta deliberately serializes the small points economy, including account
// deletion. Always acquire BEFORE user/session row locks; never in reverse.
export async function lockPointsEconomy(tx: PointsTx) { await tx.execute(sql`select pg_advisory_xact_lock(91917304)`) }
async function database() {
  ensurePointsEnabled()
  if (!process.env.DATABASE_URL) throw new DialogueError(503, "积分暂时不可用")
  return (await import("@/db/client")).db
}
async function actor(tx: PointsTx, id: string, moderator = false, verified = true) {
  const [user] = await tx.select().from(users).where(and(eq(users.id, id), eq(users.status, "active"), isNull(users.deletedAt))).for("update").limit(1)
  if (!user) throw new DialogueError(401, "请重新登录")
  if (moderator && !["admin", "moderator"].includes(user.role)) throw new DialogueError(403, "没有活动管理权限")
  if (verified && !user.emailVerifiedAt) throw new DialogueError(403, "验证注册邮箱后才能领取或使用积分")
  return user
}
async function change(tx: PointsTx, userId: string, operationKey: string, kind: "task" | "activity" | "hold" | "release" | "spend" | "refund", availableDelta: number, frozenDelta: number, sessionId?: string, actorUserId?: string, reason = "") {
  await tx.insert(accounts).values({ userId }).onConflictDoNothing()
  const [account] = await tx.select().from(accounts).where(eq(accounts.userId, userId)).for("update").limit(1)
  const available = account.available + availableDelta, frozen = account.frozen + frozenDelta
  if (!Number.isSafeInteger(available) || !Number.isSafeInteger(frozen) || available < 0 || frozen < 0 || available + frozen > POINTS_LIMIT) throw new DialogueError(409, available < 0 ? "可用积分不足" : "积分余额不一致，请联系支持")
  if (kind === "task" || kind === "activity") {
    // Keep capacity for refunds of awarded-but-not-yet-completed activities.
    // Otherwise earning up to the cap after winning could make cancellation
    // refunds impossible. This query shares the economy transaction lock.
    const [reserved] = await tx.select({ points: sql<number>`coalesce(sum(${applications.bidPoints}), 0)::int` }).from(applications)
      .innerJoin(sessions, eq(sessions.id, applications.sessionId)).where(and(eq(applications.userId, userId), eq(applications.pointsState, "spent"), eq(sessions.status, "closed")))
    if (available + frozen + reserved.points > POINTS_LIMIT) throw new DialogueError(409, "积分已达上限（含待完成活动的可退积分），请在活动完成后领取")
  }
  await tx.update(accounts).set({ available, frozen, updatedAt: new Date() }).where(eq(accounts.userId, userId))
  await tx.insert(entries).values({ userId, operationKey, kind, availableDelta, frozenDelta, availableAfter: available, frozenAfter: frozen, sessionId, actorUserId, reason })
}
export async function getPointsWallet(userId: string): Promise<PointsWallet> {
  const db = await database()
  const [user] = await db.select({ emailVerifiedAt: users.emailVerifiedAt }).from(users).where(and(eq(users.id, userId), eq(users.status, "active"), isNull(users.deletedAt))).limit(1)
  if (!user) throw new DialogueError(401, "请重新登录")
  const keys = Object.keys(pointTasks) as Array<keyof typeof pointTasks>
  const now = new Date()
  const [accountRows, claimed, history] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1),
    db.select({ key: entries.operationKey }).from(entries).where(and(eq(entries.userId, userId), inArray(entries.operationKey, keys.map(key => pointTaskKey(key, now))))),
    db.select().from(entries).where(eq(entries.userId, userId)).orderBy(desc(entries.createdAt), desc(entries.id)).limit(30),
  ])
  const account = accountRows[0]
  return { available: account?.available ?? 0, frozen: account?.frozen ?? 0, verified: Boolean(user.emailVerifiedAt), policy: pointsPolicy,
    tasks: keys.map(key => ({ id: key, ...pointTasks[key], claimed: claimed.some(entry => entry.key === pointTaskKey(key, now)) })),
    entries: history.map(row => ({ id: row.id, kind: row.kind, availableDelta: row.availableDelta, frozenDelta: row.frozenDelta, createdAt: row.createdAt.toISOString() })) }
}
export async function claimPointTask(userId: string, task: keyof typeof pointTasks) {
  const db = await database()
  return db.transaction(async tx => {
    await lockPointsEconomy(tx); await actor(tx, userId)
    const operationKey = pointTaskKey(task)
    const [existing] = await tx.select({ id: entries.id }).from(entries).where(and(eq(entries.userId, userId), eq(entries.operationKey, operationKey))).limit(1)
    if (existing) return { claimed: true, awarded: 0 }
    await change(tx, userId, operationKey, "task", pointTasks[task].points, 0)
    return { claimed: true, awarded: pointTasks[task].points }
  })
}
export async function grantActivityPoints(userId: string, raw: unknown) {
  const data = pointGrantInput.parse(raw), db = await database()
  return db.transaction(async tx => {
    await lockPointsEconomy(tx); await actor(tx, userId, true, false)
    const [recipient] = await tx.select().from(users).where(and(eq(users.email, data.email), eq(users.status, "active"), isNull(users.deletedAt))).limit(1)
    if (!recipient?.emailVerifiedAt) throw new DialogueError(404, "未找到已验证邮箱的有效参与者")
    const operationKey = `activity:${data.campaignId}`
    const [existing] = await tx.select().from(entries).where(and(eq(entries.userId, recipient.id), eq(entries.operationKey, operationKey))).limit(1)
    if (existing) {
      if (existing.availableDelta !== data.points || existing.reason !== data.reason) throw new DialogueError(409, "同一活动的奖励记录已存在且内容不同")
      return { awarded: 0, recorded: true }
    }
    await change(tx, recipient.id, operationKey, "activity", data.points, 0, undefined, userId, data.reason)
    return { awarded: data.points, recorded: true }
  })
}
function applicationView(row: typeof applications.$inferSelect): DialogueApplication {
  return { id: row.id, sessionId: row.sessionId, status: row.status as DialogueApplication["status"], question: row.question, decisionNote: row.decisionNote, createdAt: row.createdAt.toISOString(), bidPoints: row.bidPoints, pointsState: row.pointsState as DialogueApplication["pointsState"] }
}
export async function getMyPointBid(userId: string, sessionId: string) {
  const db = await database()
  const [user] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, userId), eq(users.status, "active"), isNull(users.deletedAt))).limit(1)
  if (!user) throw new DialogueError(401, "请重新登录")
  const [row] = await db.select().from(applications).where(and(eq(applications.userId, userId), eq(applications.sessionId, sessionId))).limit(1)
  return row ? applicationView(row) : null
}
export async function placePointBid(userId: string, sessionId: string, raw: unknown) {
  const data = pointBidInput.parse(raw)
  if (hasSensitive(data.question)) throw new DialogueError(400, "请移除联系方式或身份信息")
  const db = await database()
  return db.transaction(async tx => {
    await lockPointsEconomy(tx); await actor(tx, userId)
    const [session] = await tx.select().from(sessions).where(eq(sessions.id, sessionId)).for("update").limit(1)
    const now = new Date()
    if (!session || session.selectionMode !== "points" || !session.publishedAt || session.status !== "open" || session.signupEndsAt <= now || session.startsAt <= now) throw new DialogueError(409, "本场当前不能出价")
    if (session.createdBy === userId) throw new DialogueError(403, "活动组织者不能参与本场竞拍")
    if (session.companyId) {
      const [company] = await tx.select({ id: companies.id }).from(companies).where(and(eq(companies.id, session.companyId), eq(companies.reviewStatus, "reviewable"), isNull(companies.deletedAt))).limit(1)
      if (!company) throw new DialogueError(409, "关联公司暂不可用")
    }
    const [existing] = await tx.select().from(applications).where(and(eq(applications.sessionId, sessionId), eq(applications.userId, userId))).for("update").limit(1)
    if (existing?.requestId === data.requestId) {
      if (existing.status !== "withdrawn" && (existing.bidPoints !== data.points || existing.question !== data.question)) throw new DialogueError(409, "重复请求内容不一致")
      return applicationView(existing)
    }
    const [previous] = await tx.select({ id: entries.id }).from(entries).where(and(eq(entries.userId, userId), eq(entries.operationKey, `bid:${data.requestId}`))).limit(1)
    if (previous) throw new DialogueError(409, "此出价请求已有后续处理，请刷新状态")
    const held = existing?.pointsState === "held" ? existing.bidPoints : 0
    if (data.points < session.minBidPoints || data.points <= held) throw new DialogueError(400, held ? "再次出价必须高于上次积分" : `本场至少 ${session.minBidPoints} 积分`)
    if (!existing) {
      const [count] = await tx.select({ total: sql<number>`count(*)::int` }).from(applications).where(eq(applications.sessionId, sessionId))
      if (count.total >= 50) throw new DialogueError(409, "本场试点的 50 人名额已满")
    }
    await change(tx, userId, `bid:${data.requestId}`, "hold", -(data.points - held), data.points - held, sessionId)
    const values = { requestId: data.requestId, question: data.question, status: "submitted", bidPoints: data.points, pointsState: "held", bidPlacedAt: now, decisionNote: null, updatedAt: now }
    const [row] = existing
      ? await tx.update(applications).set(values).where(eq(applications.id, existing.id)).returning()
      : await tx.insert(applications).values({ ...values, userId, sessionId }).returning()
    await tx.insert(audits).values({ sessionId, actorUserId: userId, applicationId: row.id, action: "point_bid", fromStatus: existing?.status ?? null, toStatus: "submitted" })
    return applicationView(row)
  })
}
// Caller already holds the economy + session lock. No public endpoint accepts
// arbitrary balance deltas; every entry has a server-derived operation key.
export async function releasePointApplication(tx: PointsTx, row: typeof applications.$inferSelect, refundSpent = false) {
  if (row.pointsState === "held") {
    await change(tx, row.userId, `release:${row.id}:${row.requestId}`, "release", row.bidPoints, -row.bidPoints, row.sessionId)
  } else if (refundSpent && row.pointsState === "spent") {
    await change(tx, row.userId, `refund:${row.id}:${row.requestId}`, "refund", row.bidPoints, 0, row.sessionId)
  } else return
  await tx.update(applications).set({ pointsState: "released", updatedAt: new Date() }).where(eq(applications.id, row.id))
}
export async function refundPointSession(tx: PointsTx, sessionId: string) {
  const rows = await tx.select().from(applications).where(and(eq(applications.sessionId, sessionId), inArray(applications.pointsState, ["held", "spent"])))
  for (const row of rows) await releasePointApplication(tx, row, true)
}
export async function settlePointAuction(userId: string, sessionId: string) {
  const db = await database()
  return db.transaction(async tx => {
    await lockPointsEconomy(tx); await actor(tx, userId, true, false)
    const [session] = await tx.select().from(sessions).where(eq(sessions.id, sessionId)).for("update").limit(1)
    if (!session || session.selectionMode !== "points") throw new DialogueError(404, "积分竞拍不存在")
    if (!["open", "closed"].includes(session.status)) throw new DialogueError(409, "活动当前不可确认中选")
    if (session.pointsSettledAt) return { settled: true, status: session.status }
    if (!["open", "closed"].includes(session.status) || session.signupEndsAt > new Date() || session.startsAt <= new Date()) throw new DialogueError(409, "截止后、活动开始前才能确认中选结果")
    const rows = await tx.select().from(applications).where(and(eq(applications.sessionId, sessionId), eq(applications.status, "submitted"), eq(applications.pointsState, "held")))
      .orderBy(desc(applications.bidPoints), asc(applications.bidPlacedAt), asc(applications.id))
    const eligible = rows.length ? await tx.select({ id: users.id }).from(users).where(and(inArray(users.id, rows.map(row => row.userId)), eq(users.status, "active"), isNull(users.deletedAt), sql`${users.emailVerifiedAt} IS NOT NULL`)).for("update") : []
    const winner = rows.find(row => eligible.some(user => user.id === row.userId))
    for (const row of rows) {
      if (row.id === winner?.id) {
        await change(tx, row.userId, `spend:${sessionId}`, "spend", 0, -row.bidPoints, sessionId)
        await tx.update(applications).set({ status: "selected", pointsState: "spent", decisionNote: "积分竞拍中选", updatedAt: new Date() }).where(eq(applications.id, row.id))
      } else {
        await releasePointApplication(tx, row)
        await tx.update(applications).set({ status: "not_selected", decisionNote: "本次未中选，冻结积分已退回", updatedAt: new Date() }).where(eq(applications.id, row.id))
      }
    }
    await tx.update(sessions).set({ status: "closed", pointsSettledAt: new Date(), updatedAt: new Date() }).where(eq(sessions.id, sessionId))
    await tx.insert(audits).values({ sessionId, actorUserId: userId, action: "points_settle", fromStatus: session.status, toStatus: "closed" })
    return { settled: true, status: "closed" }
  })
}
export async function deleteUserPoints(tx: PointsTx, userId: string) {
  // Account deletion has already acquired the economy lock. Destroy the
  // non-transferable balance and private ledger, not transfer it elsewhere.
  await tx.delete(entries).where(eq(entries.userId, userId))
  await tx.update(entries).set({ actorUserId: null }).where(eq(entries.actorUserId, userId))
  await tx.delete(accounts).where(eq(accounts.userId, userId))
}
