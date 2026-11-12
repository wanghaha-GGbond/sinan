"use client"
import { useRef, useState } from "react"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { ThumbsUp, Share2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { withNext } from "@/lib/navigation"
import { WebButton } from "@/components/ui/web-button"
import { forumFetch, forumBody } from "./forum-client"

export function ForumActions({ postId, usefulCount, isUseful, onRefresh }: { postId: string; usefulCount: number; isUseful: boolean; onRefresh?: () => void }) {
  const { user } = useAuth(), client = useQueryClient(), lock = useRef(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [copied, setCopied] = useState(false)
  const returnTo = `/community/${postId}`
  async function vote() {
    if (lock.current || !user) return
    lock.current = true; setBusy(true); setError("")
    try {
      const result = await forumFetch<{ usefulCount: number; isUseful: boolean }>(`/api/forum/posts/${postId}/useful`, forumBody("PUT", { useful: !isUseful }))
      if (!Number.isInteger(result.usefulCount) || result.usefulCount < 0 || result.isUseful !== !isUseful) throw new Error("未能确认点赞结果")
      await client.invalidateQueries({ queryKey: ["forum"] }); onRefresh?.()
    } catch (e) { setError(e instanceof Error ? e.message : "操作失败") }
    finally { lock.current = false; setBusy(false) }
  }
  async function share() {
    setCopied(false)
    try { await navigator.clipboard.writeText(new URL(returnTo, window.location.origin).href); setCopied(true) }
    catch { setError("复制失败，请复制浏览器地址栏中的帖子链接") }
  }
  return <div><div className="flex flex-wrap items-center gap-2">
    {user ? <WebButton variant="quiet" size="sm" type="button" disabled={busy} aria-pressed={isUseful} onClick={() => void vote()}><ThumbsUp className="size-4" aria-hidden="true" />{isUseful ? "已赞" : "赞同"} · {usefulCount}</WebButton> : <WebButton asChild variant="quiet" size="sm"><Link href={withNext("/login", returnTo)}><ThumbsUp className="size-4" aria-hidden="true" />赞同 · {usefulCount}</Link></WebButton>}
    <WebButton variant="quiet" size="sm" type="button" onClick={() => void share()}><Share2 className="size-4" aria-hidden="true" />{copied ? "链接已复制" : "分享"}</WebButton>
  </div>{error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}</div>
}
export function ForumReport({ postId, replyId }: { postId: string; replyId?: string }) {
  const { user } = useAuth(), busy = useRef(false)
  const [reason, setReason] = useState("privacy"), [state, setState] = useState<"idle" | "busy" | "sent">("idle"), [error, setError] = useState("")
  async function report() {
    if (busy.current || state !== "idle") return
    busy.current = true; setState("busy"); setError("")
    try {
      const result = await forumFetch<{ received: boolean }>(`/api/forum/posts/${postId}/report`, forumBody("POST", { reason, replyId }))
      if (result.received !== true) throw new Error("未能确认举报结果")
      setState("sent")
    } catch (e) { setError(e instanceof Error ? e.message : "举报失败"); setState("idle") } finally { busy.current = false }
  }
  return <details className="text-xs text-muted-foreground"><summary className="min-h-11 cursor-pointer py-3 focus-visible:outline-2 focus-visible:outline-ring">举报</summary>
    {!user ? <Link href={withNext("/login", `/community/${postId}`)} className="inline-flex min-h-11 items-center underline">登录后举报</Link> : state === "sent" ? <p role="status" className="py-2">已收到举报</p> : <div className="flex flex-wrap items-center gap-2 pb-3"><select aria-label="举报原因" className="min-h-11 rounded-lg border border-border bg-card px-2 text-foreground" value={reason} onChange={e => setReason(e.target.value)}><option value="privacy">泄露隐私</option><option value="attack">人身攻击</option><option value="spam">广告或垃圾内容</option><option value="other">其他问题</option></select><WebButton variant="secondary" size="sm" disabled={state === "busy"} onClick={() => void report()}>提交举报</WebButton></div>}
    {error && <p role="alert" className="pb-2 text-destructive">{error}</p>}
  </details>
}
