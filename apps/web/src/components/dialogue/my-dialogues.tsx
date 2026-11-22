"use client"
import Link from "next/link"
import { useRef, useState } from "react"
import { ArrowRight, LockKeyhole, RefreshCw, Ticket } from "lucide-react"
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-context"
import { applicationStatusLabels, dialogueStatusLabels, type MyDialogueApplication } from "@/lib/dialogue"
import { forumFetch } from "@/components/forum/forum-client"
import { WebButton } from "@/components/ui/web-button"
import { DialogueErrorState, DialogueHeading, dialogueTime } from "./dialogue-common"
import { DialogueRoomArt } from "./dialogue-room-art"
import styles from "./dialogue-design.module.css"

export function MyDialogues() {
  const { user, loading } = useAuth()
  if (loading) return <p role="status" className="p-6">正在检查登录状态…</p>
  return <section className={styles.surface + " " + styles.personalSurface}><DialogueHeading title="我的对话报名" backHref="/community/dialogues" backLabel="全部对话" />{user ? <MyDialogueList key={user.id} userId={user.id} /> : <div className={styles.emptyState}><div className={styles.emptyArt}><DialogueRoomArt /></div><h2>你的下一场对话</h2><p>登录后查看报名和参与安排。</p><WebButton asChild className="mt-5"><Link href="/login?next=%2Fme%2Fdialogues">登录后查看报名<ArrowRight size={15} aria-hidden="true" /></Link></WebButton></div>}</section>
}
function MyDialogueList({ userId }: { userId: string }) {
  const client = useQueryClient()
  const rows = useInfiniteQuery({ queryKey: ["dialogues", "mine", userId], initialPageParam: "", gcTime: 0, staleTime: 0, retry: false,
    queryFn: async ({ pageParam, signal }) => { const result = await forumFetch<{ applications: MyDialogueApplication[]; nextCursor: string | null }>("/api/me/dialogues" + (pageParam ? "?cursor=" + encodeURIComponent(pageParam) : ""), { signal }); if (!Array.isArray(result.applications)) throw new Error("报名返回格式不正确"); return result },
    getNextPageParam: page => page.nextCursor ?? undefined,
  })
  const items = [...new Map((rows.data?.pages.flatMap(page => page.applications) ?? []).map(row => [row.id, row])).values()]
  return <>
    <div className={styles.myToolbar}><WebButton asChild variant="secondary"><Link href="/community/dialogues"><Ticket size={15} aria-hidden="true" />找一场对话</Link></WebButton><WebButton variant="quiet" disabled={rows.isFetching} onClick={() => void rows.refetch()}><RefreshCw size={14} aria-hidden="true" />刷新状态</WebButton></div>
    {rows.isPending ? <p role="status">正在加载报名…</p> : rows.isError && !rows.isFetchNextPageError ? <DialogueErrorState message="报名暂时无法加载" retry={() => void rows.refetch()} /> : !items.length ? <div className={styles.emptyState}><div className={styles.emptyArt}><DialogueRoomArt /></div><h2>你还没有报名对话活动</h2><p>找个感兴趣的话题，留下你想问的问题。</p></div> : <div className={styles.myList}>{items.map(row => <MyDialogueCard key={row.id} application={row} refresh={() => client.invalidateQueries({ queryKey: ["dialogues", "mine", userId] })} />)}</div>}
    {rows.isFetchNextPageError ? <p role="alert" className="py-4 text-sm text-destructive">后续报名加载失败，已加载内容保留。</p> : null}
    {rows.hasNextPage ? <WebButton variant="secondary" className="my-5 w-full" disabled={rows.isFetchingNextPage} onClick={() => void rows.fetchNextPage()}>{rows.isFetchNextPageError ? "重试更多报名" : "更多报名"}</WebButton> : null}
  </>
}
function MyDialogueCard({ application, refresh }: { application: MyDialogueApplication; refresh: () => Promise<unknown> }) {
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), lock = useRef(false)
  async function withdraw() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError("")
    try {
      const result = await forumFetch<{ id: string; status: string }>("/api/me/dialogues/" + application.id, { method: "DELETE" })
      if (result.id !== application.id || result.status !== "withdrawn") throw new Error("未能确认撤回结果，请刷新")
      setConfirm(false); await refresh()
    } catch (error) { setError(error instanceof Error ? error.message : "撤回失败，请重试") }
    finally { lock.current = false; setBusy(false) }
  }
  const date = new Date(application.startsAt)
  const month = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "long" }).format(date)
  const day = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", day: "numeric" }).format(date)
  const inactive = ["cancelled", "completed", "hidden"].includes(application.sessionStatus)
  const activeSelection = application.status === "selected" && !inactive
  return <article data-testid="my-dialogue-application" className={styles.myCard + (activeSelection ? " " + styles.myCardSelected : "")}>
    <div className={styles.myCardHead}><div className={styles.dateStamp} aria-hidden="true"><span>{month}</span><strong>{day.replace("日", "")}</strong></div><div className={styles.myCardTitle}><h2>{application.sessionStatus === "hidden" ? application.sessionTitle : <Link className="hover:underline" href={"/community/dialogues/" + application.sessionId}>{application.sessionTitle}</Link>}</h2><p className={styles.myCardDate}><time dateTime={application.startsAt}>{dialogueTime(application.startsAt)}（北京时间）</time></p></div><span className={styles.statusBadge + (activeSelection ? " " + styles.statusOpen : "")}>{applicationStatusLabels[application.status]}{inactive ? " · " + dialogueStatusLabels[application.sessionStatus] : ""}</span></div>
    <div className={styles.myCardBody}>
      {application.question ? <div className={styles.myQuestion}><span className={styles.myQuestionLabel}>我的问题</span><p>{application.question}</p></div> : null}
      {application.decisionNote ? <p className="text-xs leading-6 text-muted-foreground">处理说明：{application.decisionNote}</p> : null}
      {activeSelection && application.privateInstructions ? <div className={styles.myArrangements}><h3><LockKeyhole size={14} aria-hidden="true" />仅入选者可见的参与安排</h3><p>{application.privateInstructions}</p><small>本阶段不收款，请勿向任何人转账。</small></div> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
    <div className={styles.myCardFooter}>{application.status !== "withdrawn" ? confirm ? <div className={styles.withdrawConfirmation}><p>撤回后会清除报名问题并放弃入选名额，确定撤回？</p><div className={styles.withdrawActions}><WebButton variant="danger" disabled={busy} onClick={() => void withdraw()}>{busy ? "正在撤回…" : "确认撤回报名"}</WebButton><WebButton variant="secondary" disabled={busy} onClick={() => setConfirm(false)}>保留报名</WebButton></div></div> : <><span className="text-xs text-muted-foreground">报名内容仅本人和活动管理者可见</span><WebButton variant="quiet" onClick={() => setConfirm(true)}>撤回报名</WebButton></> : <p className="py-3 text-xs text-muted-foreground">报名问题已清除</p>}</div>
  </article>
}
