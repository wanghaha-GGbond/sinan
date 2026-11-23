"use client"
import Link from "next/link"
import { useId, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { DialogueApplication, DialogueSession } from "@/lib/dialogue"
import type { PointsWallet } from "@/lib/points"
import { forumBody, forumFetch } from "@/components/forum/forum-client"
import { WebButton } from "@/components/ui/web-button"
import { DialogueErrorState, dialogueField } from "./dialogue-common"

export function PointsBidForm({ userId, session }: { userId: string; session: DialogueSession }) {
  const wallet = useQuery({ queryKey: ["points", userId], queryFn: ({ signal }) => forumFetch<PointsWallet>("/api/me/points", { signal }), retry: false, gcTime: 0, staleTime: 0 })
  const own = useQuery({ queryKey: ["points-bid", userId, session.id], queryFn: ({ signal }) => forumFetch<{ application: DialogueApplication | null }>(`/api/dialogues/${session.id}/points-bids`, { signal }), retry: false, gcTime: 0, staleTime: 0 })
  if (wallet.isPending || own.isPending) return <p role="status">正在加载积分和出价…</p>
  if (wallet.isError || own.isError || !wallet.data || !own.data) return <DialogueErrorState message="积分和出价暂时无法加载" retry={() => { void wallet.refetch(); void own.refetch() }} />
  if (!wallet.data.verified) return <p className="text-sm">验证注册邮箱后才能使用积分。</p>
  return <BidEditor key={own.data.application?.id + ":" + own.data.application?.bidPoints + ":" + own.data.application?.status} userId={userId} session={session} wallet={wallet.data} previous={own.data.application} />
}
function BidEditor({ userId, session, wallet, previous }: { userId: string; session: DialogueSession; wallet: PointsWallet; previous: DialogueApplication | null }) {
  const id = useId(), client = useQueryClient(), lock = useRef(false), request = useRef<{ signature: string; id: string } | null>(null)
  const held = previous?.pointsState === "held" ? previous.bidPoints ?? 0 : 0
  const minimum = Math.max(session.minBidPoints ?? 1, held + 1), maximum = wallet.available + held
  const [points, setPoints] = useState(String(minimum)), [question, setQuestion] = useState(previous?.question ?? ""), [busy, setBusy] = useState(false), [error, setError] = useState("")
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (lock.current) return
    const bid = Number(points), text = question.trim()
    if (!Number.isSafeInteger(bid) || bid < minimum || bid > maximum || text.length < 10) { setError("请检查积分数量和至少 10 字的问题"); return }
    const signature = JSON.stringify([bid, text])
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() }
    lock.current = true; setBusy(true); setError("")
    try {
      const result = await forumFetch<{ application: DialogueApplication }>(`/api/dialogues/${session.id}/points-bids`, forumBody("POST", { points: bid, question: text, requestId: request.current.id }))
      if (result.application?.sessionId !== session.id || result.application.pointsState !== "held" || result.application.bidPoints !== bid) throw new Error("未能确认出价，请查看我的报名")
      await Promise.all([client.invalidateQueries({ queryKey: ["points", userId] }), client.invalidateQueries({ queryKey: ["points-bid", userId, session.id] }), client.invalidateQueries({ queryKey: ["dialogues", "mine", userId] })])
    } catch (e) { setError(e instanceof Error ? e.message : "出价失败，输入已保留") }
    finally { lock.current = false; setBusy(false) }
  }
  return <form onSubmit={submit} className="space-y-4" aria-busy={busy}><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><p>可用 {wallet.available} 积分{held ? ` · 本场已冻结 ${held}` : ""}</p><Link className="min-h-11 py-3 text-primary underline" href="/me/points">领取积分</Link></div>
    {held ? <p role="status" className="text-sm">出价已记录，积分已冻结。可继续加价，或在我的报名中撤回。</p> : null}
    <div className="grid gap-2 text-sm"><label htmlFor={id + "-points"}>本次出价（积分）</label><input id={id + "-points"} type="number" inputMode="numeric" required min={minimum} max={maximum} step={1} value={points} onChange={e => setPoints(e.target.value)} className={dialogueField} aria-describedby={id + "-policy"} /></div>
    <div className="grid gap-2 text-sm"><label htmlFor={id + "-question"}>想聊的问题</label><textarea id={id + "-question"} required minLength={10} maxLength={800} rows={4} className={dialogueField} value={question} onChange={e => setQuestion(e.target.value)} aria-describedby={id + "-policy"} /></div>
    <p id={id + "-policy"} className="text-xs leading-6 text-muted-foreground">盲拍，出价和问题不向其他用户公开。最高积分中选，同分按本次有效出价先后排序。未中选或活动取消退回；中选扣除积分，个人放弃不退回。每场最多 50 人。</p>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}{maximum < minimum ? <p className="text-sm">积分不足，先去领取任务奖励。</p> : null}
    <WebButton type="submit" className="w-full" disabled={busy || maximum < minimum}>{busy ? "正在提交…" : held ? "确认加价并冻结积分" : "确认出价并冻结积分"}</WebButton><Link className="inline-flex min-h-11 items-center text-sm underline" href="/me/dialogues">查看或撤回我的出价</Link>
  </form>
}
