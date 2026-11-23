"use client"
import Link from "next/link"
import { useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Coins, Snowflake } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import type { PointsWallet } from "@/lib/points"
import { forumBody, forumFetch } from "@/components/forum/forum-client"
import { WebButton } from "@/components/ui/web-button"
import { DialogueHeading, DialogueErrorState, dialogueTime } from "./dialogue-common"

export function MyPoints() {
  const { user, loading } = useAuth()
  return <section className="mx-auto max-w-2xl space-y-6 px-4 py-6"><DialogueHeading title="在场积分" backHref="/me" backLabel="返回我的" />{loading ? <p role="status">正在检查登录状态…</p> : user ? <Wallet key={user.id} userId={user.id} /> : <WebButton asChild><Link href="/login?next=%2Fme%2Fpoints">登录后查看积分</Link></WebButton>}</section>
}
const labels: Record<string, string> = { task: "任务奖励", activity: "活动奖励", hold: "竞拍冻结", release: "竞拍退回", spend: "中选扣除", refund: "取消退回" }
function Wallet({ userId }: { userId: string }) {
  const client = useQueryClient(), lock = useRef(false)
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState(""), [message, setMessage] = useState("")
  const wallet = useQuery({ queryKey: ["points", userId], queryFn: ({ signal }) => forumFetch<PointsWallet>("/api/me/points", { signal }), retry: false, gcTime: 0, staleTime: 0 })
  async function claim(task: "verified_email" | "daily_visit") {
    if (lock.current) return
    lock.current = true; setBusy(task); setError(""); setMessage("")
    try {
      const result = await forumFetch<{ claimed: boolean; awarded: number }>("/api/me/points/claim", forumBody("POST", { task }))
      if (result.claimed !== true || !Number.isInteger(result.awarded)) throw new Error("未能确认奖励，请刷新积分记录")
      setMessage(result.awarded ? `已领取 ${result.awarded} 积分` : "本次奖励已领取，无需重复领取")
      await client.invalidateQueries({ queryKey: ["points", userId] })
    } catch (e) { setError(e instanceof Error ? e.message : "领取失败，请重试") }
    finally { lock.current = false; setBusy(null) }
  }
  if (wallet.isPending) return <p role="status">正在加载积分…</p>
  if (wallet.isError || !wallet.data) return <DialogueErrorState message="积分暂时无法加载" retry={() => void wallet.refetch()} />
  const data = wallet.data
  return <>
    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-5"><div className="min-w-0"><p className="flex items-center gap-2 text-sm text-muted-foreground"><Coins size={16} aria-hidden="true" />可用积分</p><p data-testid="points-available" className="mt-3 text-2xl font-semibold tabular-nums tracking-tight sm:text-4xl">{data.available}</p></div><div className="min-w-0 border-l border-border pl-5"><p className="flex items-center gap-2 text-sm text-muted-foreground"><Snowflake size={16} aria-hidden="true" />竞拍冻结</p><p data-testid="points-frozen" className="mt-3 text-2xl font-semibold tabular-nums tracking-tight sm:text-4xl">{data.frozen}</p></div></div>
    <p className="text-sm leading-6 text-muted-foreground">仅用于站内活动。不可购买、转让或提现，不兑换现金，也不代表捐款。</p>
    <section className="space-y-3"><h2 className="text-lg font-semibold">领取积分</h2>{!data.verified ? <p role="status" className="text-sm">验证注册邮箱后即可领取和使用积分。</p> : null}{data.tasks.map(task => <div key={task.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-4"><div><h3 className="text-sm font-medium">{task.title}</h3><p className="mt-1 text-xs text-muted-foreground">+{task.points} 积分{task.id === "daily_visit" ? " · 北京时间每日一次" : " · 每个账号一次"}</p></div><WebButton variant="secondary" size="sm" disabled={!data.verified || task.claimed || busy !== null} onClick={() => void claim(task.id)} aria-label={task.title + (task.claimed ? "已领取" : "领取积分")}>{task.claimed ? "已领取" : busy === task.id ? "正在领取…" : "领取"}</WebButton></div>)}<p className="text-xs text-muted-foreground">活动奖励由运营核发，不按公司好评或投票发放。</p></section>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}{message ? <p role="status" className="text-sm">{message}</p> : null}
    <WebButton asChild className="w-full"><Link href="/community/dialogues">看看近期对话</Link></WebButton>
    <section className="space-y-3"><h2 className="text-lg font-semibold">最近流水</h2>{data.entries.length ? <ul className="divide-y divide-border">{data.entries.map(entry => <li key={entry.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><div><p>{labels[entry.kind] ?? "积分变动"}</p><time className="text-xs text-muted-foreground" dateTime={entry.createdAt}>{dialogueTime(entry.createdAt)}</time></div><p className="text-right tabular-nums">可用 {entry.availableDelta > 0 ? "+" : ""}{entry.availableDelta}<span className="block text-xs text-muted-foreground">冻结 {entry.frozenDelta > 0 ? "+" : ""}{entry.frozenDelta}</span></p></li>)}</ul> : <p className="text-sm text-muted-foreground">领取第一笔积分后，记录会出现在这里。</p>}</section>
  </>
}
