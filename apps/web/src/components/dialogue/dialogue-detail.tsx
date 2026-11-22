"use client"
import Link from "next/link"
import { useId, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-context"
import { withNext } from "@/lib/navigation"
import { dialogueStatusLabels, fundingModes, type DialogueSession, type DialogueApplication } from "@/lib/dialogue"
import { forumBody, forumFetch } from "@/components/forum/forum-client"
import { WebButton } from "@/components/ui/web-button"
import { dialogueField, dialogueTime, DialogueErrorState, DialogueHeading, DialogueMoneyNotice } from "./dialogue-common"
import { useDeadlinePassed } from "./use-deadline-passed"

export function DialogueDetail({ id }: { id: string }) {
  const event = useQuery({ queryKey: ["dialogues", "detail", id], queryFn: ({ signal }) => forumFetch<{ session: DialogueSession }>(`/api/dialogues/${id}`, { signal }), retry: false, gcTime: 0 })
  const { user, loading } = useAuth()
  const session = event.data?.session
  return <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
    <DialogueHeading title="在场 · 对话"><WebButton asChild variant="quiet" size="sm"><Link href="/me/dialogues">我的报名</Link></WebButton></DialogueHeading>
    {event.isPending ? <p role="status" className="py-8">正在加载活动…</p> : event.isError || !session ? <DialogueErrorState message="活动不存在、已下架或暂时无法加载" retry={() => void event.refetch()} /> : <>
      <article className="rounded-xl border border-border bg-card p-5 sm:p-7"><p className="text-xs text-muted-foreground">{dialogueStatusLabels[session.status]} · {session.durationMinutes} 分钟 · {session.capacity} 个名额</p><h2 className="mt-3 break-words text-2xl font-semibold leading-9">{session.title}</h2>
        <div className="mt-5 border-y border-border py-4"><h3 className="font-semibold">{session.guestName}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{session.guestBio}</p>{session.companyId && session.companyName ? <Link className="mt-2 inline-flex min-h-11 items-center text-sm text-primary-deep underline" href={`/company/${session.companyId}/community`}>{session.companyName}的讨论</Link> : null}</div>
        <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7">{session.description}</p><dl className="mt-5 space-y-2 text-sm text-muted-foreground"><div><dt className="inline">活动时间：</dt><dd className="inline">{dialogueTime(session.startsAt)}（北京时间）</dd></div><div><dt className="inline">报名截止：</dt><dd className="inline">{dialogueTime(session.signupEndsAt)}（北京时间）</dd></div></dl>
        {session.status === "cancelled" ? <p role="status" className="mt-5 text-sm">活动已取消：{session.cancelReason}</p> : null}
        {session.recap ? <section className="mt-6 border-t border-border pt-5"><h3 className="font-semibold">访谈纪要</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{session.recap}</p></section> : null}
      </article>
      <div className="mt-5"><DialogueMoneyNotice /><p className="mt-2 text-xs text-muted-foreground">{fundingModes[session.fundingMode]}，不是已完成的捐赠。</p></div>
      <div className="mt-6">{loading ? <p role="status">正在检查登录状态…</p> : !user ? <WebButton asChild><Link href={withNext("/login", `/community/dialogues/${id}`)}>登录后报名提问</Link></WebButton> : <DialogueApplicationForm key={`${user.id}:${id}`} userId={user.id} session={session} />}</div>
    </>}
  </section>
}
function DialogueApplicationForm({ userId, session }: { userId: string; session: DialogueSession }) {
  const questionId = useId()
  const client = useQueryClient(), lock = useRef(false), submission = useRef<{ question: string; id: string } | null>(null)
  const [question, setQuestion] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false)
  const expired = useDeadlinePassed(Date.parse(session.signupEndsAt))
  const closed = session.status !== "open" || expired
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (lock.current || closed) return
    const trimmed = question.trim()
    if (trimmed.length < 10) { setError("请至少填写 10 个字的问题"); return }
    if (submission.current?.question !== trimmed) submission.current = { question: trimmed, id: crypto.randomUUID() }
    lock.current = true; setBusy(true); setError("")
    try {
      const result = await forumFetch<{ application: DialogueApplication }>(`/api/dialogues/${session.id}/applications`, forumBody("POST", { question: trimmed, requestId: submission.current.id }))
      if (!result.application?.id || result.application.sessionId !== session.id || result.application.status !== "submitted") throw new Error("未能确认报名结果，请查看我的报名")
      setSaved(true); await client.invalidateQueries({ queryKey: ["dialogues", "mine", userId] })
    } catch (error) { setError(error instanceof Error ? error.message : "报名失败，请重试") }
    finally { lock.current = false; setBusy(false) }
  }
  if (closed) return <p className="text-sm text-muted-foreground">本场活动已停止报名。<Link className="ml-2 inline-flex min-h-11 items-center underline" href="/me/dialogues">查看我的报名</Link></p>
  if (saved) return <div role="status" className="rounded-lg border border-border p-5"><p>报名已提交，等待审核。</p><Link href="/me/dialogues" className="mt-2 inline-flex min-h-11 items-center text-sm text-primary-deep underline">查看或撤回报名</Link></div>
  return <form onSubmit={submit} className="space-y-4 rounded-xl border border-border p-5"><h3 className="font-semibold">你想问嘉宾什么？</h3><div className="grid gap-2 text-sm"><label htmlFor={questionId}>报名问题</label><textarea id={questionId} required minLength={10} maxLength={800} rows={5} className={dialogueField} value={question} onChange={event => setQuestion(event.target.value)} placeholder="说说你希望了解的工作经历或行业问题。" /></div><p className="text-xs leading-6 text-muted-foreground">问题仅你与活动管理者可见。报名不保证入选，请勿填写联系方式、个人隐私或商业秘密。</p>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<div className="flex flex-wrap gap-3"><WebButton type="submit" disabled={busy}>{busy ? "正在提交…" : "免费报名"}</WebButton><WebButton asChild variant="quiet"><Link href="/me/dialogues">已有报名？查看状态</Link></WebButton></div></form>
}
