/**
 * M3 私聊段位规则引擎
 *
 * Per docs/04-spec-f3-growth.md §3:
 *   - 同级或相邻段位: 直接私聊 (|trust diff| ≤ 1)
 *   - 跨两级及以上: 进入「请求队列」(|trust diff| ≥ 2)
 *   - 接收方在「请求」箱按自己节奏处理, 不产生未读红点、不推送
 *   - 请求附 140 字自我介绍 (与拍卖「为什么是我」同一交互范式)
 *
 * 端到端加密: schema 留 encryptionVersion 字段, 默认 'none' (M3.1+ 实现)
 *
 * 关键不变量:
 *   - dm_threads: 配对唯一 — 一对用户一个 thread (由 service 层 (lo, hi) 强制)
 *   - dm_messages: 仅 thread 参与者可发送
 *   - dm_requests: pending → accepted (开 thread) / rejected / withdrawn
 */
import { and, desc, eq, or, sql } from "drizzle-orm"

import { dmMessages, dmRequests, dmThreads } from "@/db/schema/dm"
import { users } from "@/db/schema/users"

export const INTRO_MAX_LENGTH = 140
export const MESSAGE_MAX_LENGTH = 4000
export const TRUST_DIFF_THRESHOLD = 2 // ≥ 2 走请求队列

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * 段位差判定: true = 走请求队列, false = 直接开 thread.
 */
export function shouldQueueByTrustDiff(
  fromTrustLevel: number,
  toTrustLevel: number
): boolean {
  return Math.abs(fromTrustLevel - toTrustLevel) >= TRUST_DIFF_THRESHOLD
}

function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

// ---------------------------------------------------------------------------
// createThreadOrRequest
// ---------------------------------------------------------------------------

export type CreateDmResult =
  | { kind: "thread"; threadId: string; alreadyExisted: boolean }
  | { kind: "request"; requestId: string }
  | {
      kind: "error"
      reason:
        | "self_dm_not_allowed"
        | "user_not_found"
        | "intro_too_long"
        | "intro_required_for_request"
    }

/**
 * 段位差 ≤ 1 → 直接开 (或复用) thread;
 * 段位差 ≥ 2 → 创建 dm_request.
 * 申请人是同一对用户已存在 pending request → 返回既有 requestId (不创建重复)。
 */
export async function createThreadOrRequest(
  fromUserId: string,
  toUserId: string,
  introText: string
): Promise<CreateDmResult> {
  if (fromUserId === toUserId) {
    return { kind: "error", reason: "self_dm_not_allowed" }
  }
  const trimmed = String(introText ?? "").trim()

  const { db } = await import("@/db/client")
  const [fromUser] = await db
    .select({ id: users.id, trustLevel: users.trustLevel })
    .from(users)
    .where(eq(users.id, fromUserId))
    .limit(1)
  const [toUser] = await db
    .select({ id: users.id, trustLevel: users.trustLevel })
    .from(users)
    .where(eq(users.id, toUserId))
    .limit(1)
  if (!fromUser || !toUser) return { kind: "error", reason: "user_not_found" }

  const needsRequest = shouldQueueByTrustDiff(
    fromUser.trustLevel,
    toUser.trustLevel
  )

  if (!needsRequest) {
    // 尝试找既有 thread
    const [lo, hi] = orderPair(fromUserId, toUserId)
    const [existing] = await db
      .select({ id: dmThreads.id })
      .from(dmThreads)
      .where(
        and(
          eq(dmThreads.participantAId, lo),
          eq(dmThreads.participantBId, hi)
        )
      )
      .limit(1)
    if (existing) {
      return { kind: "thread", threadId: existing.id, alreadyExisted: true }
    }

    const [created] = await db
      .insert(dmThreads)
      .values({
        participantAId: lo,
        participantBId: hi,
      })
      .returning({ id: dmThreads.id })
    return { kind: "thread", threadId: created.id, alreadyExisted: false }
  }

  // 走请求队列
  if (!trimmed) return { kind: "error", reason: "intro_required_for_request" }
  if (trimmed.length > INTRO_MAX_LENGTH) {
    return { kind: "error", reason: "intro_too_long" }
  }

  // 防止对同一人发重复 pending request
  const [existingReq] = await db
    .select({ id: dmRequests.id })
    .from(dmRequests)
    .where(
      and(
        eq(dmRequests.fromUserId, fromUserId),
        eq(dmRequests.toUserId, toUserId),
        eq(dmRequests.status, "pending")
      )
    )
    .limit(1)
  if (existingReq) {
    return { kind: "request", requestId: existingReq.id }
  }

  const [created] = await db
    .insert(dmRequests)
    .values({
      fromUserId,
      toUserId,
      introText: trimmed,
      status: "pending",
    })
    .returning({ id: dmRequests.id })
  return { kind: "request", requestId: created.id }
}

// ---------------------------------------------------------------------------
// accept / reject / withdraw
// ---------------------------------------------------------------------------

export type RequestMutationResult =
  | { ok: true; threadId: string; requestId: string }
  | {
      ok: false
      reason: "request_not_found" | "not_recipient" | "not_pending"
    }

async function findPendingRequest(requestId: string) {
  const { db } = await import("@/db/client")
  const [row] = await db
    .select()
    .from(dmRequests)
    .where(eq(dmRequests.id, requestId))
    .limit(1)
  return row ?? null
}

/**
 * toUser 接受 → 创建 thread + 标 request accepted.
 * 如果两个 user 之间已有 thread, 复用之.
 */
export async function acceptRequest(
  requestId: string,
  actorUserId: string
): Promise<RequestMutationResult> {
  const req = await findPendingRequest(requestId)
  if (!req) return { ok: false, reason: "request_not_found" }
  if (req.toUserId !== actorUserId)
    return { ok: false, reason: "not_recipient" }
  if (req.status !== "pending")
    return { ok: false, reason: "not_pending" }

  const { db } = await import("@/db/client")
  const [lo, hi] = orderPair(req.fromUserId, req.toUserId)

  const result = await db.transaction(async (tx) => {
    const [existingThread] = await tx
      .select({ id: dmThreads.id })
      .from(dmThreads)
      .where(
        and(
          eq(dmThreads.participantAId, lo),
          eq(dmThreads.participantBId, hi)
        )
      )
      .limit(1)
    let createdId: string | undefined = existingThread?.id
    if (!existingThread) {
      const [inserted] = await tx
        .insert(dmThreads)
        .values({ participantAId: lo, participantBId: hi })
        .returning({ id: dmThreads.id })
      createdId = inserted.id
    }
    await tx
      .update(dmRequests)
      .set({ status: "accepted", actionedAt: new Date() })
      .where(eq(dmRequests.id, requestId))
    return createdId
  })

  if (!result) {
    return { ok: false, reason: "request_not_found" }
  }
  return {
    ok: true,
    threadId: result,
    requestId,
  }
}

export type RejectResult =
  | { ok: true; requestId: string }
  | {
      ok: false
      reason: "request_not_found" | "not_recipient" | "not_pending"
    }

export async function rejectRequest(
  requestId: string,
  actorUserId: string,
  reason?: string
): Promise<RejectResult> {
  const req = await findPendingRequest(requestId)
  if (!req) return { ok: false, reason: "request_not_found" }
  if (req.toUserId !== actorUserId)
    return { ok: false, reason: "not_recipient" }
  if (req.status !== "pending")
    return { ok: false, reason: "not_pending" }

  const { db } = await import("@/db/client")
  await db
    .update(dmRequests)
    .set({
      status: "rejected",
      actionedAt: new Date(),
      rejectReason: reason?.trim() || null,
    })
    .where(eq(dmRequests.id, requestId))
  return { ok: true, requestId }
}

export type WithdrawResult =
  | { ok: true; requestId: string }
  | {
      ok: false
      reason: "request_not_found" | "not_sender" | "not_pending"
    }

export async function withdrawRequest(
  requestId: string,
  actorUserId: string
): Promise<WithdrawResult> {
  const req = await findPendingRequest(requestId)
  if (!req) return { ok: false, reason: "request_not_found" }
  if (req.fromUserId !== actorUserId)
    return { ok: false, reason: "not_sender" }
  if (req.status !== "pending")
    return { ok: false, reason: "not_pending" }

  const { db } = await import("@/db/client")
  await db
    .update(dmRequests)
    .set({ status: "withdrawn", actionedAt: new Date() })
    .where(eq(dmRequests.id, requestId))
  return { ok: true, requestId }
}

// ---------------------------------------------------------------------------
// sendMessage
// ---------------------------------------------------------------------------

export type SendMessageResult =
  | { ok: true; messageId: string }
  | {
      ok: false
      reason:
        | "thread_not_found"
        | "not_participant"
        | "content_empty"
        | "content_too_long"
    }

export async function sendMessage(
  threadId: string,
  senderId: string,
  content: string
): Promise<SendMessageResult> {
  const trimmed = String(content ?? "").trim()
  if (!trimmed) return { ok: false, reason: "content_empty" }
  if (trimmed.length > MESSAGE_MAX_LENGTH)
    return { ok: false, reason: "content_too_long" }

  const { db } = await import("@/db/client")
  const [thread] = await db
    .select()
    .from(dmThreads)
    .where(eq(dmThreads.id, threadId))
    .limit(1)
  if (!thread) return { ok: false, reason: "thread_not_found" }
  if (thread.participantAId !== senderId && thread.participantBId !== senderId) {
    return { ok: false, reason: "not_participant" }
  }

  // 段位差 ≥ 2 不影响"已经 accept 过的 thread 继续" — 这是 spec
  // "已经在 thread 里的允许继续" 的明示。
  const [inserted] = await db.transaction(async (tx) => {
    const [m] = await tx
      .insert(dmMessages)
      .values({ threadId, senderId, content: trimmed })
      .returning({ id: dmMessages.id })
    await tx
      .update(dmThreads)
      .set({ lastMessageAt: new Date() })
      .where(eq(dmThreads.id, threadId))
    return [m]
  })
  return { ok: true, messageId: inserted.id }
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

export type ThreadListItem = {
  id: string
  otherUserId: string
  otherDisplayName: string
  otherTrustLevel: number
  lastMessageAt: Date
  lastMessagePreview: string | null
  encryptionVersion: string
}

/**
 * 当前用户的 thread 列表, 只显示最新一条 preview.
 * 任何 thread 的 encryption_version 字段都暴露 (默认 'none')。
 */
export async function listMyThreads(userId: string): Promise<ThreadListItem[]> {
  const { db } = await import("@/db/client")
  const rows = await db
    .select({
      id: dmThreads.id,
      aId: dmThreads.participantAId,
      bId: dmThreads.participantBId,
      lastMessageAt: dmThreads.lastMessageAt,
      encryptionVersion: dmThreads.encryptionVersion,
    })
    .from(dmThreads)
    .where(
      or(
        eq(dmThreads.participantAId, userId),
        eq(dmThreads.participantBId, userId)
      )
    )
    .orderBy(desc(dmThreads.lastMessageAt))
    .limit(100)

  if (rows.length === 0) return []

  // 拉对方 user + 每 thread 最新一条 message
  const otherIds = Array.from(
    new Set(rows.map((r) => (r.aId === userId ? r.bId : r.aId)))
  )
  const otherUsers = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      trustLevel: users.trustLevel,
    })
    .from(users)
    .where(sql`${users.id} = ANY(${otherIds})`)

  const userMap = new Map(otherUsers.map((u) => [u.id, u]))

  const latestMessages = await Promise.all(
    rows.map(async (r) => {
      const [m] = await db
        .select({
          content: dmMessages.content,
          createdAt: dmMessages.createdAt,
        })
        .from(dmMessages)
        .where(eq(dmMessages.threadId, r.id))
        .orderBy(desc(dmMessages.createdAt))
        .limit(1)
      return { threadId: r.id, m: m ?? null }
    })
  )
  const msgMap = new Map(latestMessages.map((x) => [x.threadId, x.m]))

  return rows.map((r) => {
    const otherId = r.aId === userId ? r.bId : r.aId
    const u = userMap.get(otherId)
    const m = msgMap.get(r.id)
    return {
      id: r.id,
      otherUserId: otherId,
      otherDisplayName: u?.displayName ?? "匿名用户",
      otherTrustLevel: u?.trustLevel ?? 0,
      lastMessageAt: r.lastMessageAt,
      lastMessagePreview: m?.content ?? null,
      encryptionVersion: r.encryptionVersion,
    }
  })
}

export type MessageItem = {
  id: string
  threadId: string
  senderId: string
  content: string
  createdAt: Date
}

/**
 * 单 thread 全部消息. 必须在路由层校验 caller 是 thread 参与者.
 */
export async function listThreadMessages(
  threadId: string
): Promise<MessageItem[]> {
  const { db } = await import("@/db/client")
  return await db
    .select({
      id: dmMessages.id,
      threadId: dmMessages.threadId,
      senderId: dmMessages.senderId,
      content: dmMessages.content,
      createdAt: dmMessages.createdAt,
    })
    .from(dmMessages)
    .where(eq(dmMessages.threadId, threadId))
    .orderBy(dmMessages.createdAt)
    .limit(500)
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export type RequestItem = {
  id: string
  fromUserId: string
  toUserId: string
  introText: string
  status: string
  createdAt: Date
  actionedAt: Date | null
  rejectReason: string | null
}

/**
 * 我的请求箱 — toUser=me (inbox) + fromUser=me (outgoing) 都返回.
 * viewerUserId 必须传; 不返回对方 user 表的字段, 由调用方按需 join.
 */
export async function listMyRequests(
  viewerUserId: string,
  status?: "pending" | "accepted" | "rejected" | "withdrawn"
): Promise<{ incoming: RequestItem[]; outgoing: RequestItem[] }> {
  const { db } = await import("@/db/client")
  const whereParts = [
    or(
      eq(dmRequests.toUserId, viewerUserId),
      eq(dmRequests.fromUserId, viewerUserId)
    ),
  ]
  if (status) whereParts.push(eq(dmRequests.status, status))

  const all = await db
    .select({
      id: dmRequests.id,
      fromUserId: dmRequests.fromUserId,
      toUserId: dmRequests.toUserId,
      introText: dmRequests.introText,
      status: dmRequests.status,
      createdAt: dmRequests.createdAt,
      actionedAt: dmRequests.actionedAt,
      rejectReason: dmRequests.rejectReason,
    })
    .from(dmRequests)
    .where(and(...whereParts))
    .orderBy(desc(dmRequests.createdAt))
    .limit(200)

  return {
    incoming: all.filter((r) => r.toUserId === viewerUserId),
    outgoing: all.filter((r) => r.fromUserId === viewerUserId),
  }
}
