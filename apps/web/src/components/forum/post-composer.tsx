"use client"
import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ZaichangIcon } from "@/components/ui/zaichang-icon"
import { WebButton } from "@/components/ui/web-button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { withNext } from "@/lib/navigation"
import { forumCategories, forumPostInput } from "@/lib/forum"
import type { CompanyListItem } from "@/lib/types"
import { forumFetch, forumBody } from "./forum-client"

export function PostComposer({ companies, companyId = "", returnTo }: { companies: CompanyListItem[]; companyId?: string; returnTo: string }) {
  const { user, loading } = useAuth()
  if (loading) return <p role="status" className="border-b border-border p-5 text-sm text-muted-foreground">正在检查登录状态…</p>
  if (!user) return <div id="forum-composer" className="flex items-center gap-3 border-b border-border px-4 py-4 sm:px-6"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-tint text-primary-deep"><ZaichangIcon name="conversation" /></span><span className="flex-1 text-sm text-muted-foreground">今天想聊点什么？</span><WebButton asChild variant="secondary" size="sm"><Link href={withNext("/login", returnTo)}>登录后发帖</Link></WebButton></div>
  return <ComposerForm key={user.id + ":" + companyId} companies={companies} initialCompanyId={companyId} />
}
function ComposerForm({ companies, initialCompanyId }: { companies: CompanyListItem[]; initialCompanyId: string }) {
  const router = useRouter(), busy = useRef(false)
  const submission = useRef<{ signature: string; id: string } | null>(null)
  const [companyId, setCompanyId] = useState(initialCompanyId)
  const [category, setCategory] = useState<keyof typeof forumCategories>("question")
  const [title, setTitle] = useState(""), [content, setContent] = useState("")
  const [error, setError] = useState(""), [saving, setSaving] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy.current) return
    const signature = JSON.stringify({ companyId, category, title, content })
    if (submission.current?.signature !== signature) submission.current = { signature, id: crypto.randomUUID() }
    const parsed = forumPostInput.safeParse({ companyId, category, title, content, requestId: submission.current.id })
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    busy.current = true; setSaving(true); setError("")
    try {
      const result = await forumFetch<{ post: { id: string; status: string } }>("/api/forum/posts", forumBody("POST", parsed.data))
      if (!result.post?.id || !["pending_review", "visible", "hidden", "rejected"].includes(result.post.status)) throw new Error("未能确认发帖结果，请重试")
      router.push(`/community/${result.post.id}`)
    } catch (e) { setError(e instanceof Error ? e.message : "发帖失败，请重试") }
    finally { busy.current = false; setSaving(false) }
  }
  const field = "min-h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
  return <details id="forum-composer" className="scroll-mt-24 border-b border-border">
    <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 px-4 py-4 text-sm text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring sm:px-6"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-tint text-primary-deep"><ZaichangIcon name="conversation" /></span><span className="flex-1">今天想聊点什么？</span><span className="text-xs text-primary-deep">发帖</span></summary>
    <form onSubmit={submit} className="grid gap-4 border-t border-border p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">公司<select aria-label="发帖公司" className={field} value={companyId} onChange={e => setCompanyId(e.target.value)} required><option value="">选择公司</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="grid gap-2 text-sm">话题<select className={field} value={category} onChange={e => setCategory(e.target.value as keyof typeof forumCategories)}>{Object.entries(forumCategories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      </div>
      <label className="grid gap-2 text-sm">标题<input className={field} value={title} onChange={e => setTitle(e.target.value)} minLength={4} maxLength={100} required placeholder="你想讨论什么？" /></label>
      <label className="grid gap-2 text-sm">正文<Textarea value={content} onChange={e => setContent(e.target.value)} minLength={10} maxLength={3000} required className="min-h-36" placeholder="分享经历，或说说你正在面对的问题。" /></label>
      <p className="text-xs text-muted-foreground">匿名展示，审核后公开。请勿填写他人姓名、联系方式。</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <WebButton type="submit" disabled={saving}>{saving ? "正在提交…" : "提交帖子"}</WebButton>
    </form>
  </details>
}
