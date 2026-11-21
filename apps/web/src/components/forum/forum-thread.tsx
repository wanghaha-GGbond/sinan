"use client"
import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-context"
import { forumCategories, type ForumDetail } from "@/lib/forum"
import { withNext } from "@/lib/navigation"
import { WebButton } from "@/components/ui/web-button"
import { Textarea } from "@/components/ui/textarea"
import { ForumActions, ForumReport } from "./forum-actions"
import { CompanyLogo } from "@/components/company/company-logo"
import { ZaichangIcon } from "@/components/ui/zaichang-icon"
import { forumBody, forumFetch } from "./forum-client"

export function ForumThread({ postId }: { postId: string }) {
  const { user, loading } = useAuth(), router = useRouter(), client = useQueryClient()
  const [error, setError] = useState(""), [deleting, setDeleting] = useState(false), lock = useRef(false)
  const detail = useInfiniteQuery({ queryKey: ["forum", "thread", postId, user?.id ?? "anonymous"], initialPageParam: "", enabled: !loading,
    queryFn: ({ pageParam, signal }) => forumFetch<ForumDetail>(`/api/forum/posts/${postId}${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`, { signal }),
    getNextPageParam: page => page.nextCursor ?? undefined, retry: false, staleTime: 0, gcTime: 0 })
  const first = detail.data?.pages[0], post = first?.post
  const replies = Array.from(new Map((detail.data?.pages.flatMap(p => p.replies) ?? []).map(r => [r.id, r])).values())
  async function remove(replyId?: string) {
    if (lock.current || !window.confirm(replyId ? "删除这条回复？删除后不可恢复。" : "删除这篇帖子和公开讨论？删除后不可恢复。")) return
    lock.current = true; setDeleting(true); setError("")
    try {
      const result = await forumFetch<{ deleted: boolean }>(`/api/forum/posts/${postId}`, forumBody("DELETE", { replyId }))
      if (result.deleted !== true) throw new Error("未能确认删除结果")
      await client.invalidateQueries({ queryKey: ["forum"] })
      if (!replyId) router.push("/community?feed=mine")
    } catch (e) { setError(e instanceof Error ? e.message : "删除失败") }
    finally { lock.current = false; setDeleting(false) }
  }
  return <section className="break-normal bg-background sm:px-6"><div className="mx-auto max-w-3xl sm:border-x sm:border-border">
    <Link href="/community" className="inline-flex min-h-14 items-center gap-2 px-4 text-sm text-muted-foreground hover:text-foreground sm:px-6">← 返回社区</Link>
    {detail.isPending ? <p role="status" className="p-5">正在加载帖子…</p> : (detail.isError && !detail.isFetchNextPageError) || !post ? <div role="alert" className="rounded-xl border border-border bg-card p-6"><h1 className="text-xl font-semibold">帖子暂不可用</h1><p className="mt-2 text-sm text-muted-foreground">{detail.error?.message ?? "内容不存在或暂不可见"}</p><WebButton className="mt-4" variant="secondary" onClick={() => void detail.refetch()}>重试帖子</WebButton></div> : <>
      <article className="border-y border-border px-4 py-5 sm:px-6">
        <Link className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-foreground" href={`/company/${post.companyId}/community`}><CompanyLogo company={{ id: post.companyId, name: post.companyName }} className="size-10 sm:size-10" />{post.companyName}论坛</Link>
        <p className="mt-3 text-xs text-muted-foreground">{post.authorLabel} · {forumCategories[post.category]} · {new Date(post.createdAt).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" })}</p>
        <h1 className="mt-4 break-words text-2xl font-semibold leading-9">{post.title}</h1>
        <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7">{post.content}</p>
        {post.status !== "visible" && <p role="status" className="mt-5 rounded-lg bg-muted p-3 text-sm">{post.status === "pending_review" ? "已提交，等待审核" : post.status === "rejected" ? "未通过审核" : "暂不公开"} · 仅自己可见</p>}
        <div className="mt-5 border-t border-border pt-3">{post.status === "visible" && <ForumActions postId={postId} usefulCount={post.usefulCount} isUseful={post.isUseful} />}{post.isMine ? <button disabled={deleting} type="button" className="min-h-11 text-xs text-muted-foreground underline" onClick={() => void remove()}>删除帖子</button> : post.status === "visible" && <ForumReport postId={postId} />}</div>
      </article>
      <section className="px-4 py-5 sm:px-6" aria-label="帖子回复">
        <h2 className="text-lg font-semibold">回复 · {post.replyCount}</h2>
        {replies.length === 0 && <div className="flex items-center gap-3 py-6 text-muted-foreground"><ZaichangIcon name="reply" className="size-6" /><p className="text-sm">还没有公开回复</p></div>}
        {replies.map(r => <article key={r.id} className="border-b border-border py-5"><p className="text-xs text-muted-foreground">{r.authorLabel}{r.isPostAuthor ? " · 楼主" : ""}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{r.content}</p>{r.isMine ? <button type="button" disabled={deleting} onClick={() => void remove(r.id)} className="min-h-11 text-xs text-muted-foreground underline">删除回复</button> : <ForumReport postId={postId} replyId={r.id} />}</article>)}
        {detail.isFetchNextPageError && <p role="alert" className="text-sm text-destructive">后续回复加载失败，已加载内容保留。</p>}
        {detail.hasNextPage && <WebButton variant="secondary" disabled={detail.isFetchingNextPage} onClick={() => void detail.fetchNextPage()}>{detail.isFetchNextPageError ? "重试更多回复" : "更多回复"}</WebButton>}
        {first?.myReplies.map(r => <div key={r.id} className="my-3 rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">{r.status === "pending_review" ? "等待审核" : r.status === "rejected" ? "未通过审核" : "暂不公开"} · 仅自己可见</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{r.content}</p><button type="button" disabled={deleting} onClick={() => void remove(r.id)} className="min-h-11 text-xs underline">删除回复</button></div>)}
        {post.status === "visible" && (user ? <ReplyForm key={user.id} postId={postId} onSaved={() => void client.invalidateQueries({ queryKey: ["forum"] })} /> : <WebButton asChild variant="secondary" className="mt-4"><Link href={withNext("/login", `/community/${postId}`)}>登录后回复</Link></WebButton>)}
      </section>
    </>}
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
  </div></section>
}
function ReplyForm({ postId, onSaved }: { postId: string; onSaved: () => void }) {
  const [content, setContent] = useState(""), [error, setError] = useState(""), [saving, setSaving] = useState(false), [saved, setSaved] = useState(false)
  const lock = useRef(false), attempt = useRef<{ content: string; id: string } | null>(null)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (lock.current) return
    if (attempt.current?.content !== content) attempt.current = { content, id: crypto.randomUUID() }
    lock.current = true; setSaving(true); setSaved(false); setError("")
    try {
      const result = await forumFetch<{ reply: { id: string; status: string } }>(`/api/forum/posts/${postId}/replies`, forumBody("POST", { content, requestId: attempt.current.id }))
      if (!result.reply?.id || !["pending_review", "visible", "hidden", "rejected"].includes(result.reply.status)) throw new Error("未能确认回复结果")
      setContent(""); attempt.current = null; setSaved(true); onSaved()
    } catch (e) { setError(e instanceof Error ? e.message : "回复失败") }
    finally { lock.current = false; setSaving(false) }
  }
  return <form onSubmit={submit} className="mt-5 space-y-3"><label className="grid gap-2 text-sm">写回复<Textarea value={content} onChange={e => setContent(e.target.value)} minLength={2} maxLength={1000} required className="min-h-24" /></label><p className="text-xs text-muted-foreground">匿名展示，审核后公开。</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{saved && <p role="status" className="text-sm text-primary-deep">回复已提交</p>}<WebButton type="submit" disabled={saving}>{saving ? "正在提交…" : "提交回复"}</WebButton></form>
}
