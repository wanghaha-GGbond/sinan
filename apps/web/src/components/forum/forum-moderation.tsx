"use client"
import { useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { WebButton } from "@/components/ui/web-button"
import type { ForumQueueItem } from "@/lib/server/forum-service"
import { forumFetch, forumBody } from "./forum-client"
export function ForumModeration() {
  const queue = useQuery({ queryKey: ["forum-moderation"], queryFn: () => forumFetch<{ pending: ForumQueueItem[]; reported: ForumQueueItem[] }>("/api/moderation/forum"), retry: false, gcTime: 0 })
  return <section className="mx-auto max-w-4xl px-4 py-8"><h1 className="text-2xl font-semibold">论坛审核</h1>{queue.isPending ? <p className="py-5" role="status">正在加载队列…</p> : queue.isError ? <div role="alert"><p>队列加载失败</p><WebButton variant="secondary" onClick={() => void queue.refetch()}>重试队列</WebButton></div> : (["pending", "reported"] as const).map(group => <section key={group} className="mt-6"><h2 className="text-lg font-semibold">{group === "pending" ? "待审核" : "举报队列"}</h2>{queue.data?.[group].length ? queue.data[group].map((item, i) => <QueueCard key={`${item.kind}:${item.id}:${i}`} item={item} refresh={() => void queue.refetch()} />) : <p className="py-5 text-sm text-muted-foreground">当前队列为空</p>}</section>)}</section>
}
function QueueCard({ item, refresh }: { item: ForumQueueItem; refresh: () => void }) {
  const [reason, setReason] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false), lock = useRef(false)
  async function act(status: "visible" | "hidden" | "rejected") {
    if (lock.current) return
    if (status !== "visible" && reason.trim().length < 2) { setError("请填写处理原因"); return }
    lock.current = true; setBusy(true); setError("")
    try {
      const result = await forumFetch<{ id: string; status: string }>("/api/moderation/forum", forumBody("PATCH", { kind: item.kind, id: item.id, postId: item.postId, status, expectedStatus: item.status, reason: reason.trim() || "审核通过" }))
      if (result.id !== item.id || result.status !== status) throw new Error("未能确认审核结果")
      refresh()
    } catch (e) { setError(e instanceof Error ? e.message : "处理失败") }
    finally { lock.current = false; setBusy(false) }
  }
  return <article className="mt-4 rounded-xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">{item.companyName} · {item.kind === "post" ? "帖子" : "回复"}{item.reason ? ` · 举报：${item.reason}` : ""}</p><h3 className="mt-2 font-semibold">{item.title}</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{item.content}</p><label className="mt-4 grid gap-2 text-sm">处理原因<input maxLength={160} className="min-h-11 rounded-lg border border-input bg-card px-3" value={reason} onChange={e => setReason(e.target.value)} /></label>{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}<div className="mt-3 flex flex-wrap gap-2"><WebButton disabled={busy} onClick={() => void act("visible")}>通过</WebButton><WebButton disabled={busy} variant="secondary" onClick={() => void act("rejected")}>拒绝</WebButton><WebButton disabled={busy} variant="secondary" onClick={() => void act("hidden")}>隐藏</WebButton></div></article>
}
