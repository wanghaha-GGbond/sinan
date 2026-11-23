"use client"
import Link from "next/link"
import { useId, useRef, useState } from "react"
import { ArrowRight, ArrowUpRight, Check, MessageCircle, Ticket } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-context"
import { withNext } from "@/lib/navigation"
import { fundingModes, type DialogueSession, type DialogueApplication } from "@/lib/dialogue"
import { forumBody, forumFetch } from "@/components/forum/forum-client"
import { WebButton } from "@/components/ui/web-button"
import { dialogueTime, DialogueErrorState, DialogueHeading, DialogueMoneyNotice, DialogueGuestInitial, DialogueStatusBadge } from "./dialogue-common"
import { DialogueRoomArt } from "./dialogue-room-art"
import { PointsBidForm } from "./points-bid-form"
import { useDeadlinePassed } from "./use-deadline-passed"
import styles from "./dialogue-design.module.css"

export function DialogueDetail({ id }: { id: string }) {
  const event = useQuery({ queryKey: ["dialogues", "detail", id], queryFn: ({ signal }) => forumFetch<{ session: DialogueSession }>("/api/dialogues/" + id, { signal }), retry: false, gcTime: 0 })
  const { user, loading } = useAuth()
  const session = event.data?.session
  const expired = useDeadlinePassed(session ? Date.parse(session.signupEndsAt) : Number.POSITIVE_INFINITY)
  const closed = session && (session.status !== "open" || expired)
  return <section className={styles.surface}>
    <DialogueHeading title="在场 · 对话" backHref="/community/dialogues" backLabel="全部对话"><WebButton asChild variant="secondary" size="sm"><Link href="/me/dialogues"><Ticket size={15} aria-hidden="true" />我的报名</Link></WebButton></DialogueHeading>
    {event.isPending ? <div role="status" className={styles.loadingCard}><span className="sr-only">正在加载活动…</span></div> : event.isError || !session ? <DialogueErrorState message="活动不存在、已下架或暂时无法加载" retry={() => void event.refetch()} /> : <>
      <header className={styles.detailHero} data-testid="dialogue-detail-hero">
        <div className={styles.detailIntro}><div className={styles.detailKicker}><span className={styles.eyebrow} aria-hidden="true">A ZAICHANG CONVERSATION</span><DialogueStatusBadge session={session} /></div><h2 className={styles.detailTitle}>{session.title}</h2>
          <div className={styles.detailGuest}><DialogueGuestInitial name={session.guestName} /><div className="min-w-0"><p className={styles.guestName}>{session.guestName}</p><p className={styles.guestCompany}>本场嘉宾{session.companyName ? " · " + session.companyName : ""}</p></div></div>
        </div>
        <div className={styles.detailArt}><DialogueRoomArt /></div>
      </header>
      {session.status === "cancelled" ? <p role="status" className={styles.cancelNotice}>活动已取消：{session.cancelReason}</p> : null}
      <div className={styles.detailGrid}>
        <div>
          <section className={styles.storySection}><h3 className={styles.storyHeading}><MessageCircle size={17} aria-hidden="true" />本场话题</h3><p className={styles.storyParagraph}>{session.description}</p></section>
          <section className={styles.storySection}><h3 className={styles.storyHeading}>本场嘉宾</h3><p className="mt-4 text-base font-semibold">{session.guestName}</p><p className={styles.storyParagraph}>{session.guestBio}</p>{session.companyId && session.companyName ? <Link className={styles.companyLink} href={"/company/" + session.companyId + "/community"}>{session.companyName}的讨论<ArrowUpRight size={15} aria-hidden="true" /></Link> : null}</section>
          {session.recap ? <section className={styles.storySection}><h3 className={styles.storyHeading}>访谈纪要</h3><p className={styles.storyParagraph}>{session.recap}</p></section> : null}
        </div>
        <aside className={styles.bookingPanel} aria-label="对话报名">
          <div className={styles.bookingSummary}><p className={styles.bookingEyebrow}>参与本场对话</p><h3 className={styles.bookingTitle}>{session.selectionMode === "points" ? "积分竞拍" : "免费报名"}</h3><p className={styles.bookingSubtitle}>{session.selectionMode === "points" ? `${session.minBidPoints} 积分起 · 不使用现金` : "先留下问题，入选后一起聊。"}</p><dl className={styles.scheduleList}>
            <div><dt>活动时间</dt><dd><time dateTime={session.startsAt}>{dialogueTime(session.startsAt)}</time><span className="block text-xs font-normal text-muted-foreground">北京时间</span></dd></div>
            <div><dt>对话时长</dt><dd>{session.durationMinutes} 分钟</dd></div>
            <div><dt>入选名额</dt><dd>{session.capacity} 人</dd></div>
            <div><dt>报名截止</dt><dd><time dateTime={session.signupEndsAt}>{dialogueTime(session.signupEndsAt)}</time><span className="block text-xs font-normal text-muted-foreground">北京时间</span></dd></div>
          </dl></div>
          <div className={styles.ticketDivider} aria-hidden="true" />
          <div className={styles.bookingAction} id="dialogue-application">{loading ? <p role="status" className="text-sm text-muted-foreground">正在检查登录状态…</p> : closed ? <ClosedApplication /> : !user ? <WebButton asChild><Link href={withNext("/login", "/community/dialogues/" + id)}>{session.selectionMode === "points" ? "登录后使用积分参加" : "登录后报名提问"}<ArrowRight size={16} aria-hidden="true" /></Link></WebButton> : session.selectionMode === "points" ? <PointsBidForm key={user.id + ":" + id} userId={user.id} session={session} /> : <DialogueApplicationForm key={user.id + ":" + id} userId={user.id} session={session} />}</div>
          <div className={styles.bookingNotice}><DialogueMoneyNotice points={session.selectionMode === "points"} />{session.selectionMode !== "points" ? <details className={styles.fundingDetails}><summary>资金方案</summary><p>{fundingModes[session.fundingMode]}，不是已完成的捐赠。</p></details> : null}</div>
        </aside>
      </div>
    </>}
  </section>
}
function ClosedApplication() {
  return <div className={styles.applicationClosed}><p>本场活动已停止报名。</p><Link href="/me/dialogues">查看我的报名<ArrowRight size={14} aria-hidden="true" /></Link></div>
}
function DialogueApplicationForm({ userId, session }: { userId: string; session: DialogueSession }) {
  const questionId = useId(), helpId = useId(), errorId = useId()
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
      const result = await forumFetch<{ application: DialogueApplication }>("/api/dialogues/" + session.id + "/applications", forumBody("POST", { question: trimmed, requestId: submission.current.id }))
      if (!result.application?.id || result.application.sessionId !== session.id || result.application.status !== "submitted") throw new Error("未能确认报名结果，请查看我的报名")
      setSaved(true); await client.invalidateQueries({ queryKey: ["dialogues", "mine", userId] })
    } catch (error) { setError(error instanceof Error ? error.message : "报名失败，请重试") }
    finally { lock.current = false; setBusy(false) }
  }
  if (closed) return <ClosedApplication />
  if (saved) return <div role="status" className={styles.applicationSuccess}><Check size={22} aria-hidden="true" /><p>报名已提交，等待审核。</p><Link href="/me/dialogues">查看或撤回报名<ArrowRight size={14} aria-hidden="true" /></Link></div>
  return <form onSubmit={submit} className={styles.applicationForm} aria-busy={busy}><h3>你想问嘉宾什么？</h3><div className={styles.applicationField}><label htmlFor={questionId}>报名问题</label><textarea id={questionId} required minLength={10} maxLength={800} rows={4} className={styles.applicationTextarea} value={question} onChange={event => setQuestion(event.target.value)} aria-describedby={helpId + (error ? " " + errorId : "")} aria-invalid={Boolean(error) && question.trim().length < 10} placeholder="说说你希望了解的工作经历或行业问题。" /></div><p id={helpId} className={styles.applicationHelp}>问题仅你与活动管理者可见。报名不保证入选，请勿填写联系方式、个人隐私或商业秘密。</p>{error ? <p role="alert" id={errorId} className="text-sm text-destructive">{error}</p> : null}<div className={styles.applicationActions}><WebButton type="submit" disabled={busy}>{busy ? "正在提交…" : "免费报名"}<ArrowRight size={15} aria-hidden="true" /></WebButton><WebButton asChild variant="quiet"><Link href="/me/dialogues">已有报名？查看状态</Link></WebButton></div></form>
}
