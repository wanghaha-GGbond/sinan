import { NextResponse } from "next/server"
import type { z } from "zod"
import { ForumError } from "@/lib/forum"
import { checkPersistentRateLimit } from "./persistent-rate-limit"
import { getAuthClientKey } from "./auth-rate-limit"
import { requireAuthUser, requireModerator } from "./auth"

export const forumHeaders = { "Cache-Control": "private, no-store" }
export function forumJson(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: forumHeaders }) }
export async function forumRoute(action: () => Promise<Response>) {
  try { return await action() }
  catch (error) {
    if (error instanceof Response) { const headers = new Headers(error.headers); headers.set("Cache-Control", "private, no-store"); return new Response(error.body, { status: error.status, headers }) }
    if (error instanceof ForumError) return forumJson({ error: error.message }, error.status)
    console.error(JSON.stringify({ event: "forum_request_failed", release: process.env.APP_RELEASE }))
    return forumJson({ error: "论坛暂时不可用，请重试" }, 503)
  }
}
export async function forumUser(request: import("next/server").NextRequest, moderator = false) {
  const origin = request.headers.get("origin")
  if (origin && !forumOriginAllowed(origin, request.url, request.headers.get("host"))) throw new ForumError(403, "请从本站提交")
  return moderator ? requireModerator(request) : requireAuthUser(request)
}
export function forumOriginAllowed(origin: string, requestUrl: string, host: string | null) {
  try {
    const source = new URL(origin), target = new URL(requestUrl)
    if (source.origin !== origin || !["http:", "https:"].includes(source.protocol)) return false
    if (source.origin === target.origin) return true
    // Next may construct the internal URL with localhost while preserving the
    // actual HTTP Host. Compare that Host, never arbitrary forwarded headers.
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(source.hostname)
    return source.host === host && (source.protocol === "https:" || (loopback && source.protocol === "http:"))
  } catch { return false }
}
export async function readForumJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const reader = request.body?.getReader()
  if (!reader) throw new ForumError(400, "请填写内容")
  const chunks: Uint8Array[] = []; let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break
      length += value.length
      if (length > 16 * 1024) { await reader.cancel(); throw new ForumError(413, "内容过长") }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  try {
    const bytes = new Uint8Array(length); let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
    const result = schema.safeParse(JSON.parse(new TextDecoder().decode(bytes)))
    if (!result.success) throw new ForumError(400, result.error.issues[0]?.message ?? "内容不完整")
    return result.data
  } catch (error) { if (error instanceof ForumError) throw error; throw new ForumError(400, "提交格式无效") }
}
export async function limitForumWrite(request: Request, userId: string, action: string, maxRequests: number, windowSeconds = 3600) {
  for (const [key, max] of [[`user:${userId}`, maxRequests], [`ip:${getAuthClientKey(request)}`, maxRequests * 10]] as const) {
    const result = await checkPersistentRateLimit(`forum:${action}:${key}`, { maxRequests: max, windowSeconds })
    if (!result.allowed) {
      if (result.unavailable) throw new ForumError(503, "论坛暂时不可用，请稍后再试")
      throw new Response(JSON.stringify({ error: "操作过于频繁，请稍后再试" }), { status: 429, headers: { ...forumHeaders, "Content-Type": "application/json", "Retry-After": String(result.retryAfter) } })
    }
  }
}
