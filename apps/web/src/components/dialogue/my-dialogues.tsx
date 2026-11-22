"use client"
import Link from "next/link"
import { useRef, useState } from "react"
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-context"
import { applicationStatusLabels, type MyDialogueApplication } from "@/lib/dialogue"
import { forumFetch } from "@/components/forum/forum-client"
import { WebButton } from "@/components/ui/web-button"
import { DialogueErrorState, DialogueHeading, dialogueTime } from "./dialogue-common"

export function MyDialogues() {
  const { user, loading } = useAuth()
  if (loading) return <p role="status" className="p-6">正在检查登录状态…</p>
  return <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6"><DialogueHeading title="我的对话报名" />{user ? <MyDialogueList key={user.id} userId={user.id} /> : <WebButton asChild><Link href="/login?next=%2Fme%2Fdialogues">登录后查看报名</Link></WebButton>}</section>
}
function MyDialogueList({ userId }: { userId: string }) {
  const client = useQueryClient()
  const rows = useInfiniteQuery({ queryKey: ["dialogues", "mine", userId], initialPageParam: "", gcTime: 0, staleTime: 0, retry: false,
    queryFn: async ({ pageParam, signal }) => { const result = await forumFetch<{ applications: MyDialogueApplication[]; nextCursor: string | null }>(`/api/me/dialogues${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`, { signal }); if (!Array.isArray(result.applications)) throw new Error("报名返回格式不正确"); return result },
    getNextPageParam: page => page.nextCursor ?? undefined,
  })
  const items = [...new Map((rows.data?.pages.flatMap(page => page.applications) ?? []).map(row => [row.id, row])).values()]
  return <>
    <div className="mb-5 flex gap-2"><WebButton asChild variant="secondary"><Link href="/community/dialogues">找一场对话</Link></WebButton><WebButton variant="quiet" disabled={rows.isFetching} onClick={() => void rows.refetch()}>刷新状态</WebButton></div>
    {rows.isPending ? <p role="status">正在加载报名…</p> : rows.isError && !rows.isFetchNextPageError ? <DialogueErrorState message="报名暂时无法加载" retry={() => void rows.refetch()} /> : !items.length ? <p className="py-8 text-sm text-muted-foreground">你还没有报名对话活动</p> : items.map(row => <MyDialogueCard key={row.id} application={row} refresh={() => client.invalidateQueries({ queryKey: ["dialogues", "mine", userId] })} />)}
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
      const result = await forumFetch<{ id: string; status: string }>(`/api/me/dialogues/${application.id}`, { method: "DELETE" })
      if (result.id !== application.id || result.status !== "withdrawn") throw new Error("未能确认撤回结果，请刷新")
      setConfirm(false); await refresh()
    } catch (error) { setError(error instanceof Error ? error.message : "撤回失败，请重试") }
    finally { lock.current = false; setBusy(false) }
  }
  return <article data-testid="my-dialogue-application" className="mb-4 rounded-xl border border-border p-5"><p className="text-xs text-muted-foreground">{applicationStatusLabels[application.status]} · {dialogueTime(application.startsAt)}（北京时间）</p><h2 className="mt-2 break-words font-semibold">{application.sessionStatus === "hidden" ? application.sessionTitle : <Link className="hover:underline" href={`/community/dialogues/${application.sessionId}`}>{application.sessionTitle}</Link>}</h2>
    {application.question ? <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{application.question}</p> : null}{application.decisionNote ? <p className="mt-3 text-sm text-muted-foreground">处理说明：{application.decisionNote}</p> : null}
    {application.privateInstructions ? <div className="mt-4 rounded-lg bg-primary-tint p-4"><h3 className="text-sm font-semibold">仅入选者可见的参与安排</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{application.privateInstructions}</p><p className="mt-2 text-xs text-muted-foreground">本阶段不收款，请勿向任何人转账。</p></div> : null}
    {application.status !== "withdrawn" ? confirm ? <div className="mt-4 space-y-3"><p className="text-sm">撤回后会清除报名问题并放弃入选名额，确定撤回？</p><div className="flex flex-wrap gap-2"><WebButton variant="danger" disabled={busy} onClick={() => void withdraw()}>{busy ? "正在撤回…" : "确认撤回报名"}</WebButton><WebButton variant="secondary" disabled={busy} onClick={() => setConfirm(false)}>保留报名</WebButton></div></div> : <WebButton className="mt-4" variant="quiet" onClick={() => setConfirm(true)}>撤回报名</WebButton> : <p className="mt-3 text-xs text-muted-foreground">报名问题已清除</p>}{error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
  </article>
}
