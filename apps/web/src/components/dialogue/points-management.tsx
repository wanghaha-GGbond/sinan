"use client"
import { useRef, useState } from "react"
import type { DialogueAdminSession } from "@/lib/dialogue"
import { forumBody, forumFetch } from "@/components/forum/forum-client"
import { WebButton } from "@/components/ui/web-button"
import { dialogueField } from "./dialogue-common"
import { useDeadlinePassed } from "./use-deadline-passed"

export function PointsSettlement({ session, refresh }: { session: DialogueAdminSession; refresh: () => Promise<unknown> }) {
  const expired = useDeadlinePassed(Date.parse(session.signupEndsAt)), lock = useRef(false)
  const begun = useDeadlinePassed(Date.parse(session.startsAt))
  const [busy, setBusy] = useState(false), [error, setError] = useState("")
  async function settle() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError("")
    try {
      const result = await forumFetch<{ settled: boolean; status: string }>(`/api/moderation/dialogues/${session.id}/points-settle`, { method: "POST" })
      if (!result.settled || result.status !== "closed") throw new Error("未能确认中选结果，请刷新")
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : "确认失败，请重试") }
    finally { lock.current = false; setBusy(false) }
  }
  if (session.pointsSettledAt) return <p className="mt-3 text-sm">积分结果已确认；未中选的冻结积分已退回。</p>
  if (!["open", "closed"].includes(session.status)) return null
  return <div className="mt-4 space-y-2"><p className="text-sm">截止后按最高积分确认中选，同分按有效出价先后排序。不可人工改选。</p><WebButton variant="secondary" disabled={busy || !expired || begun} onClick={() => void settle()}>{busy ? "正在确认…" : "按积分确认中选"}</WebButton>{begun ? <p role="alert" className="text-sm">已过活动开始时间，请取消活动退回积分。</p> : !expired ? <p className="text-xs text-muted-foreground">出价截止后开放操作。</p> : null}{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}</div>
}
export function ActivityPointGrant() {
  const lock = useRef(false)
  const [campaign, setCampaign] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("")
  async function grant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current) return
    const fields = new FormData(event.currentTarget)
    lock.current = true; setBusy(true); setError(""); setMessage("")
    try {
      const result = await forumFetch<{ recorded: boolean; awarded: number }>("/api/moderation/points/grant", forumBody("POST", { campaignId: campaign.trim(), email: String(fields.get("email")).trim().toLowerCase(), points: Number(fields.get("points")), reason: String(fields.get("reason")).trim() }))
      if (!result.recorded || !Number.isInteger(result.awarded)) throw new Error("未能确认奖励记录，请核对")
      setMessage(result.awarded ? `活动奖励 ${result.awarded} 积分已记录` : "该参与者已收到此活动奖励，未重复发放")
    } catch (e) { setError(e instanceof Error ? e.message : "发放失败，输入已保留") }
    finally { lock.current = false; setBusy(false) }
  }
  return <details className="my-6 rounded-xl border border-border p-5"><summary className="min-h-11 cursor-pointer font-semibold">核发活动积分</summary><form className="mt-4 grid gap-4" onSubmit={grant}>
    <p className="text-sm text-muted-foreground">仅向已验证邮箱的真实参与者发放。同一活动编号、同一参与者仅可发放一次；不按公司好评或投票奖励。</p>
    <label className="grid gap-2 text-sm">活动编号（UUID，同一活动重复使用）<input required pattern="[0-9a-fA-F-]{36}" value={campaign} onChange={e => setCampaign(e.target.value)} className={dialogueField} /></label><WebButton type="button" variant="quiet" onClick={() => setCampaign(crypto.randomUUID())}>生成新活动编号</WebButton>
    <label className="grid gap-2 text-sm">参与者注册邮箱<input name="email" type="email" required className={dialogueField} /></label>
    <label className="grid gap-2 text-sm">奖励积分<input name="points" type="number" required min={1} max={1000} step={1} defaultValue={10} className={dialogueField} /></label>
    <label className="grid gap-2 text-sm">核发依据<input name="reason" required minLength={4} maxLength={120} className={dialogueField} /></label>
    <WebButton type="submit" disabled={busy}>{busy ? "正在核发…" : "确认核发活动积分"}</WebButton>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}{message ? <p role="status" className="text-sm">{message}</p> : null}
  </form></details>
}
