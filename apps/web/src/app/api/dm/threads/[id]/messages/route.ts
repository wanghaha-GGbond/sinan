/**
 * GET  /api/dm/threads/[id]/messages — 单 thread 全部消息
 * POST /api/dm/threads/[id]/messages — 发送消息
 *
 * 必须是 thread 参与者, 否则 403. 已在 thread 内的段位差不再卡 (spec 明确:
 * "已经 accept 过的允许继续")。
 */
import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { getAuthUser } from "@/lib/server/auth"
import { listThreadMessages, sendMessage } from "@/lib/server/dm-engine"
import { checkRateLimit, getRateLimitKey } from "@/lib/server/rate-limit"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }
  const { id: threadId } = await params
  if (!threadId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  try {
    const { db } = await import("@/db/client")
    const { dmThreads } = await import("@/db/schema/dm")
    const [thread] = await db
      .select({
        id: dmThreads.id,
        a: dmThreads.participantAId,
        b: dmThreads.participantBId,
      })
      .from(dmThreads)
      .where(eq(dmThreads.id, threadId))
      .limit(1)
    if (!thread) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 })
    }
    if (thread.a !== user.userId && thread.b !== user.userId) {
      return NextResponse.json({ error: "无权查看该会话" }, { status: 403 })
    }
    const messages = await listThreadMessages(threadId)
    return NextResponse.json({ messages })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  const rl = checkRateLimit(getRateLimitKey(request, "dm.send"), {
    maxRequests: 60,
    windowSeconds: 60,
  })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "操作过于频繁, 请稍后再试" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }

  const { id: threadId } = await params
  if (!threadId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  let body: { content?: string }
  try {
    body = (await request.json()) as { content?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const content = String(body.content ?? "")

  try {
    const result = await sendMessage(threadId, user.userId, content)
    if (!result.ok) {
      const status =
        result.reason === "thread_not_found"
          ? 404
          : result.reason === "not_participant"
            ? 403
            : 400
      return NextResponse.json({ error: result.reason }, { status })
    }
    return NextResponse.json(
      { ok: true, messageId: result.messageId },
      { status: 201 }
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
