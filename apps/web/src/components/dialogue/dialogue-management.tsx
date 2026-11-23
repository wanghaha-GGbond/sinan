"use client"
import Link from "next/link"
import { useRef, useState } from "react"
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-context"
import { useCompanySearch } from "@/lib/queries/company-search"
import { applicationStatusLabels, dialogueStatusLabels, fundingModes, type DialogueAdminSession, type DialogueApplication, type DialogueAction } from "@/lib/dialogue"
import { forumBody, forumFetch } from "@/components/forum/forum-client"
import { WebButton } from "@/components/ui/web-button"
import { DialogueErrorState, DialogueHeading, DialogueMoneyNotice, dialogueField, dialogueTime } from "./dialogue-common"
import { useDeadlinePassed } from "./use-deadline-passed"
import { pointsEnabled } from "@/lib/points"
import { ActivityPointGrant, PointsSettlement } from "./points-management"

export function DialogueManagement() {
  const { user, loading } = useAuth()
  if (loading) return <p role="status" className="p-6">正在检查权限…</p>
  if (!user || !["admin", "moderator"].includes(user.role)) return <p role="alert" className="p-6">没有活动管理权限</p>
  return <ManageSessions key={user.id} userId={user.id} />
}
function ManageSessions({ userId }: { userId: string }) {
  const client = useQueryClient()
  const queue = useInfiniteQuery({ queryKey: ["dialogues", "admin", userId], initialPageParam: "", retry: false, gcTime: 0, staleTime: 0,
    queryFn: async ({ pageParam, signal }) => { const result = await forumFetch<{ sessions: DialogueAdminSession[]; nextCursor: string | null }>(`/api/moderation/dialogues${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`, { signal }); if (!Array.isArray(result.sessions)) throw new Error("活动返回格式不正确"); return result },
    getNextPageParam: page => page.nextCursor ?? undefined,
  })
  const refresh = () => client.invalidateQueries({ queryKey: ["dialogues"] })
  const items = [...new Map((queue.data?.pages.flatMap(page => page.sessions) ?? []).map(row => [row.id, row])).values()]
  return <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6"><DialogueHeading title="对话活动管理" /><DialogueMoneyNotice points={pointsEnabled()} /><CreateDialogue refresh={refresh} />{pointsEnabled() ? <ActivityPointGrant /> : null}
    {queue.isPending ? <p role="status" className="py-8">正在加载活动…</p> : queue.isError && !queue.isFetchNextPageError ? <DialogueErrorState message="活动管理暂时无法加载" retry={() => void queue.refetch()} /> : !items.length ? <p className="py-8 text-sm text-muted-foreground">还没有活动草稿</p> : items.map(session => <ManageSession key={`${session.id}:${session.status}`} session={session} userId={userId} refresh={refresh} />)}
    {queue.isFetchNextPageError ? <p role="alert">后续活动加载失败，已加载内容保留。</p> : null}{queue.hasNextPage ? <WebButton variant="secondary" disabled={queue.isFetchingNextPage} onClick={() => void queue.fetchNextPage()}>{queue.isFetchNextPageError ? "重试更多活动" : "更多活动"}</WebButton> : null}
  </section>
}
function CreateDialogue({ refresh }: { refresh: () => Promise<unknown> }) {
  const catalog = useCompanySearch()
  const [mode, setMode] = useState("manual")
  const lock = useRef(false), identity = useRef<{ signature: string; id: string } | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("")
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current) return
    const form = event.currentTarget, fields = new FormData(form)
    const startsAt = Date.parse(String(fields.get("startsAt"))), signupEndsAt = Date.parse(String(fields.get("signupEndsAt")))
    if (!Number.isFinite(startsAt) || !Number.isFinite(signupEndsAt)) { setError("请填写有效的开始与截止时间"); return }
    const data = { title: String(fields.get("title") ?? "").trim(), description: String(fields.get("description") ?? "").trim(), guestName: String(fields.get("guestName") ?? "").trim(), guestBio: String(fields.get("guestBio") ?? "").trim(), companyId: String(fields.get("companyId") ?? "").trim() || null,
      durationMinutes: Number(fields.get("durationMinutes")), capacity: mode === "points" ? 1 : Number(fields.get("capacity")), startsAt: new Date(startsAt).toISOString(), signupEndsAt: new Date(signupEndsAt).toISOString(),
      fundingMode: mode === "points" ? "undecided" : String(fields.get("fundingMode")), guestConsentConfirmed: fields.get("guestConsentConfirmed") === "on",
      selectionMode: mode, minBidPoints: mode === "points" ? Number(fields.get("minBidPoints")) : 1 }
    const signature = JSON.stringify(data)
    if (identity.current?.signature !== signature) identity.current = { signature, id: crypto.randomUUID() }
    lock.current = true; setBusy(true); setError(""); setMessage("")
    try {
      const result = await forumFetch<{ session: { id: string; status: string } }>("/api/moderation/dialogues", forumBody("POST", { ...data, requestId: identity.current.id }))
      if (!result.session?.id || result.session.status !== "draft") throw new Error("未能确认草稿，请刷新活动列表")
      form.reset(); setMode("manual"); identity.current = null; setMessage("草稿已保存，尚未公开"); await refresh()
    } catch (error) { setError(error instanceof Error ? error.message : "保存失败，请重试") }
    finally { lock.current = false; setBusy(false) }
  }
  return <details className="my-6 rounded-xl border border-border p-5"><summary className="min-h-11 cursor-pointer font-semibold">新建对话活动</summary><form onSubmit={create} className="mt-4 grid gap-4">
    {pointsEnabled() ? <><label className="grid gap-2 text-sm">参与方式<select className={dialogueField} value={mode} onChange={event => setMode(event.target.value)}><option value="manual">免费报名，人工筛选</option><option value="points">积分竞拍，最高积分中选</option></select></label>{mode === "points" ? <label className="grid gap-2 text-sm">最低出价积分<input name="minBidPoints" type="number" min={1} max={1000000} step={1} defaultValue={1} required className={dialogueField} /></label> : null}</> : null}
    <label className="grid gap-2 text-sm">活动标题<input name="title" required minLength={4} maxLength={100} className={dialogueField} /></label>
    <label className="grid gap-2 text-sm">活动介绍<textarea name="description" required minLength={20} maxLength={2400} rows={4} className={dialogueField} /></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm">嘉宾姓名或公开称呼<input name="guestName" required minLength={2} maxLength={80} className={dialogueField} /></label><label className="grid gap-2 text-sm">关联公司（选填）<select name="companyId" className={dialogueField} disabled={catalog.isPending}><option value="">不关联公司</option>{(catalog.data ?? []).map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label></div>
    {catalog.isError ? <p className="text-sm text-muted-foreground">公司列表暂时无法加载。<button type="button" className="min-h-11 underline" onClick={() => void catalog.refetch()}>重新加载公司</button></p> : null}
    <label className="grid gap-2 text-sm">嘉宾介绍<textarea name="guestBio" required minLength={10} maxLength={1200} rows={3} className={dialogueField} /></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm">开始时间（本机时区）<input name="startsAt" type="datetime-local" required className={dialogueField} /></label><label className="grid gap-2 text-sm">报名截止（本机时区）<input name="signupEndsAt" type="datetime-local" required className={dialogueField} /></label><label className="grid gap-2 text-sm">时长（分钟）<input name="durationMinutes" type="number" required min={15} max={120} defaultValue={45} className={dialogueField} /></label><label className="grid gap-2 text-sm">入选名额<input key={mode} name="capacity" type="number" required min={1} max={mode === "points" ? 1 : 20} readOnly={mode === "points"} defaultValue={1} className={dialogueField} /></label></div>
    {mode === "points" ? <p className="text-sm text-muted-foreground">积分竞拍仅 1 个名额，不使用现金，不作为报酬或捐赠。</p> : <label className="grid gap-2 text-sm">资金意向（非已确认方案）<select name="fundingMode" className={dialogueField} defaultValue="undecided">{Object.entries(fundingModes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
    <label className="flex min-h-11 items-start gap-3 text-sm"><input name="guestConsentConfirmed" type="checkbox" className="mt-1 size-4 accent-primary" /><span>已核对嘉宾身份，并取得公开嘉宾资料及组织本场活动的授权。</span></label>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}{message ? <p role="status" className="text-sm">{message}</p> : null}<WebButton type="submit" disabled={busy}>{busy ? "正在保存…" : "保存草稿"}</WebButton>
  </form></details>
}
function ManageSession({ session, userId, refresh }: { session: DialogueAdminSession; userId: string; refresh: () => Promise<unknown> }) {
  const ended = useDeadlinePassed(Date.parse(session.startsAt) + session.durationMinutes * 60_000)
  const lock = useRef(false), [busy, setBusy] = useState(false), [error, setError] = useState("")
  const [danger, setDanger] = useState<"cancel" | "hide" | null>(null), [reason, setReason] = useState("")
  const [instructions, setInstructions] = useState(session.privateInstructions), [recap, setRecap] = useState(""), [consent, setConsent] = useState(false), [queueOpen, setQueueOpen] = useState(false)
  async function act(action: DialogueAction) {
    if (lock.current) return
    lock.current = true; setBusy(true); setError("")
    try {
      const result = await forumFetch<{ id: string; status: string }>(`/api/moderation/dialogues/${session.id}`, forumBody("PATCH", action))
      const expected = action.action === "publish" ? "open" : action.action === "close" ? "closed" : action.action === "cancel" ? "cancelled" : action.action === "hide" ? "hidden" : action.action === "complete" ? "completed" : session.status
      if (result.id !== session.id || result.status !== expected) throw new Error("未能确认活动状态，请刷新")
      setDanger(null); await refresh()
    } catch (error) { setError(error instanceof Error ? error.message : "操作失败，请重试") }
    finally { lock.current = false; setBusy(false) }
  }
  const editable = ["open", "closed"].includes(session.status)
  return <article data-testid="managed-dialogue" className="mb-5 rounded-xl border border-border p-5"><p className="text-xs text-muted-foreground">{dialogueStatusLabels[session.status]} · {session.guestName} · {dialogueTime(session.startsAt)}（北京时间）</p><h2 className="mt-2 break-words text-lg font-semibold">{session.title}</h2><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{session.description}</p>
    <div className="mt-4 flex flex-wrap gap-2">{session.status === "draft" ? <WebButton disabled={busy || !session.guestConsentConfirmed} onClick={() => void act({ action: "publish" })}>发布活动</WebButton> : null}{session.status === "draft" && !session.guestConsentConfirmed ? <p className="text-sm text-muted-foreground">尚未取得嘉宾授权，不可公开；请取消草稿后补全授权重新创建。</p> : null}
      {session.status === "open" ? <WebButton disabled={busy} variant="secondary" onClick={() => void act({ action: "close" })}>结束报名</WebButton> : null}
      {["draft", "open", "closed"].includes(session.status) ? <WebButton variant="quiet" disabled={busy} onClick={() => setDanger("cancel")}>取消活动</WebButton> : null}
      {session.status !== "draft" && session.status !== "hidden" ? <WebButton variant="quiet" disabled={busy} onClick={() => setDanger("hide")}>隐藏活动</WebButton> : null}
      {session.status !== "draft" && session.status !== "hidden" ? <WebButton asChild variant="quiet"><Link href={`/community/dialogues/${session.id}`}>查看公开页</Link></WebButton> : null}
    </div>
    {session.selectionMode === "points" ? <PointsSettlement session={session} refresh={refresh} /> : null}
    {danger ? <form className="mt-4 space-y-3 rounded-lg bg-muted p-4" onSubmit={event => { event.preventDefault(); void act({ action: danger, reason }) }}><label className="grid gap-2 text-sm">{danger === "cancel" ? "取消原因（将公开展示）" : "隐藏原因（仅留审核记录）"}<input required minLength={2} maxLength={160} className={dialogueField} value={reason} onChange={event => setReason(event.target.value)} /></label><div className="flex flex-wrap gap-2"><WebButton type="submit" variant="danger" disabled={busy}>确认{danger === "cancel" ? "取消活动" : "隐藏活动"}</WebButton><WebButton type="button" variant="secondary" disabled={busy} onClick={() => setDanger(null)}>返回</WebButton></div></form> : null}
    {editable ? <details className="mt-5 border-t border-border pt-3"><summary className="min-h-11 cursor-pointer text-sm font-semibold">参与安排（仅入选者可见）</summary><form className="space-y-3" onSubmit={event => { event.preventDefault(); void act({ action: "arrangements", privateInstructions: instructions }) }}><label className="grid gap-2 text-sm">参与安排<textarea maxLength={1000} rows={4} className={dialogueField} value={instructions} onChange={event => setInstructions(event.target.value)} placeholder="会议时间和加入方式，不要填写收款链接。" /></label><WebButton disabled={busy} type="submit" variant="secondary">保存参与安排</WebButton></form></details> : null}
    {session.status === "closed" ? <details className="mt-5 border-t border-border pt-3"><summary className="min-h-11 cursor-pointer text-sm font-semibold">完成活动与公开纪要</summary><form className="space-y-3" onSubmit={event => { event.preventDefault(); void act({ action: "complete", recap, recapConsentConfirmed: consent }) }}><label className="grid gap-2 text-sm">公开纪要（选填）<textarea maxLength={4000} rows={5} className={dialogueField} value={recap} onChange={event => setRecap(event.target.value)} /></label><label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 size-4 accent-primary" /><span>已取得嘉宾及相关参与者的公开授权，并移除隐私与商业秘密。</span></label><WebButton disabled={busy || Boolean(recap.trim() && !consent) || !ended} type="submit">完成活动</WebButton><p className="text-xs text-muted-foreground">实际活动结束后才能完成；不会自动公开报名问题。</p></form></details> : null}
    {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
    <details className="mt-5 border-t border-border pt-3" onToggle={event => { if (event.currentTarget.open) setQueueOpen(true) }}><summary className="min-h-11 cursor-pointer text-sm font-semibold">审核报名</summary>{queueOpen ? <ApplicationQueue sessionId={session.id} userId={userId} editable={editable && session.selectionMode !== "points"} /> : null}</details>
  </article>
}
function ApplicationQueue({ sessionId, userId, editable }: { sessionId: string; userId: string; editable: boolean }) {
  const client = useQueryClient()
  const queue = useInfiniteQuery({ queryKey: ["dialogues", "queue", userId, sessionId], initialPageParam: "", retry: false, gcTime: 0,
    queryFn: async ({ pageParam, signal }) => { const result = await forumFetch<{ applications: DialogueApplication[]; nextCursor: string | null }>(`/api/moderation/dialogues/${sessionId}/applications${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`, { signal }); if (!Array.isArray(result.applications)) throw new Error("报名返回格式不正确"); return result },
    getNextPageParam: page => page.nextCursor ?? undefined,
  })
  const rows = [...new Map((queue.data?.pages.flatMap(page => page.applications) ?? []).map(row => [row.id, row])).values()]
  return <>{queue.isPending ? <p role="status">正在加载报名…</p> : queue.isError && !queue.isFetchNextPageError ? <DialogueErrorState message="报名审核暂时无法加载" retry={() => void queue.refetch()} /> : !rows.length ? <p className="py-4 text-sm text-muted-foreground">暂无报名</p> : rows.map(row => <ApplicationDecision key={`${row.id}:${row.status}`} application={row} editable={editable} refresh={() => client.invalidateQueries({ queryKey: ["dialogues"] })} />)}{queue.isFetchNextPageError ? <p role="alert">后续报名加载失败，已加载内容保留。</p> : null}{queue.hasNextPage ? <WebButton variant="secondary" disabled={queue.isFetchingNextPage} onClick={() => void queue.fetchNextPage()}>{queue.isFetchNextPageError ? "重试更多报名" : "更多报名"}</WebButton> : null}</>
}
function ApplicationDecision({ application, editable, refresh }: { application: DialogueApplication; editable: boolean; refresh: () => Promise<unknown> }) {
  const lock = useRef(false), [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("")
  async function decide(status: "selected" | "not_selected") {
    if (lock.current) return
    if (reason.trim().length < 2) { setError("请填写处理说明"); return }
    lock.current = true; setBusy(true); setError("")
    try {
      const result = await forumFetch<{ id: string; status: string }>(`/api/moderation/dialogues/${application.sessionId}/applications/${application.id}`, forumBody("PATCH", { status, expectedStatus: application.status, reason: reason.trim() }))
      if (result.id !== application.id || result.status !== status) throw new Error("未能确认审核结果，请刷新")
      await refresh()
    } catch (error) { setError(error instanceof Error ? error.message : "审核失败，请重试") }
    finally { lock.current = false; setBusy(false) }
  }
  return <div className="my-3 rounded-lg border border-border p-4"><p className="text-xs text-muted-foreground">{applicationStatusLabels[application.status]}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{application.question || "报名问题已清除"}</p>{editable && application.status !== "withdrawn" ? <><label className="mt-3 grid gap-2 text-sm">处理说明（报名者可见）<input maxLength={160} className={dialogueField} value={reason} onChange={event => setReason(event.target.value)} /></label><div className="mt-3 flex flex-wrap gap-2"><WebButton disabled={busy || application.status === "selected"} onClick={() => void decide("selected")}>选为参与者</WebButton><WebButton variant="secondary" disabled={busy || application.status === "not_selected"} onClick={() => void decide("not_selected")}>本次不选</WebButton></div></> : null}{error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}</div>
}
