"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, ShieldCheck } from "lucide-react"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { useAuth } from "@/lib/auth-context"

export function AuctionBidFormInline({
  auctionId,
  endsAt,
}: {
  auctionId: string
  endsAt: string
}) {
  const { user } = useAuth()
  const [amountYuan, setAmountYuan] = useState("")
  const [reasonText, setReasonText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  const ended = new Date(endsAt) <= new Date()
  const reasonCount = reasonText.length
  const reasonValid = reasonCount >= 10 && reasonCount <= 200

  if (!user) {
    return (
      <SolidCard variant="subtle" className="p-5">
        <p className="text-sm font-semibold text-foreground">出价前请先登录</p>
        <p className="mt-1 text-xs text-muted-foreground">
          登录后还需完成企业邮箱认证（L1）才能出价。
        </p>
        <div className="mt-4 flex gap-2">
          <SolidButton asChild variant="primary" size="sm">
            <Link href="/login">登录</Link>
          </SolidButton>
          <SolidButton asChild variant="secondary" size="sm">
            <Link href="/register">注册</Link>
          </SolidButton>
        </div>
      </SolidCard>
    )
  }

  if ((user.trustLevel ?? 0) < 1) {
    return (
      <SolidCard variant="subtle" className="p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">完成 L1 认证后即可出价</p>
            <p className="mt-1 text-xs text-muted-foreground">
              司南是打工人社区——拍卖的嘉宾和竞拍者都需要先完成最基本的身份验证。
            </p>
            <SolidButton asChild variant="secondary" size="sm" className="mt-3">
              <Link href="/company-verification">去认证</Link>
            </SolidButton>
          </div>
        </div>
      </SolidCard>
    )
  }

  if (ended) {
    return (
      <SolidCard variant="subtle" className="p-5">
        <p className="text-sm text-muted-foreground">该专场已截拍，出价通道关闭。</p>
      </SolidCard>
    )
  }

  async function submit() {
    setFeedback(null)
    setSubmitting(true)
    try {
      const amountCents = Math.round(Number(amountYuan) * 100)
      const res = await fetch(`/api/auctions/${auctionId}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amountCents, reasonText }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setFeedback({ ok: false, message: data.error ?? `HTTP ${res.status}` })
        return
      }
      setFeedback({
        ok: true,
        message: "出价已提交。盲拍期间互相看不到金额，只看到参与人数。截拍后嘉宾将从全部候选中选标。",
      })
      setAmountYuan("")
      setReasonText("")
    } catch (e: unknown) {
      setFeedback({ ok: false, message: e instanceof Error ? e.message : String(e) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SolidCard variant="elevated" className="p-6">
      <h2 className="text-base font-semibold">我要出价（盲拍）</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        截拍后嘉宾会从全部候选里用心动权选一个人，不一定选最高价。「为什么是我」是关键。
      </p>

      <div className="mt-4 grid gap-4">
        <label className="grid gap-1.5 text-xs font-medium text-foreground">
          出价金额（元）
          <input
            type="number"
            min="1"
            step="1"
            value={amountYuan}
            onChange={(e) => setAmountYuan(e.target.value)}
            placeholder="500"
            className="rounded-2xl border border-border/60 bg-muted px-4 py-2.5 text-sm shadow-[0_3px_0_rgba(17,24,39,0.04)] focus:outline-none focus:ring-2 focus:ring-ring"
            data-testid="auction-bid-amount"
          />
        </label>

        <label className="grid gap-1.5 text-xs font-medium text-foreground">
          为什么选我（10–200 字）
          <textarea
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            rows={4}
            placeholder="我现在在做什么、这次对话能帮我解决什么具体问题、我能带给嘉宾什么回馈…"
            className="rounded-2xl border border-border/60 bg-muted px-4 py-2.5 text-sm shadow-[0_3px_0_rgba(17,24,39,0.04)] focus:outline-none focus:ring-2 focus:ring-ring"
            data-testid="auction-bid-reason"
          />
          <span
            className={`self-end text-[10px] ${
              reasonValid ? "text-muted-foreground" : "text-destructive"
            }`}
          >
            {reasonCount} / 200
          </span>
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          提交即同意 M2 全捐约定。平台不抽佣，成交金额全额捐基金会。
        </p>
        <SolidButton
          type="button"
          variant="primary"
          size="sm"
          onClick={submit}
          disabled={submitting || !reasonValid || !amountYuan}
          data-testid="auction-bid-submit"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              提交中…
            </>
          ) : (
            "提交出价"
          )}
        </SolidButton>
      </div>

      {feedback ? (
        <p
          role="alert"
          className={`mt-3 text-xs leading-5 ${
            feedback.ok ? "text-primary" : "text-destructive"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}
    </SolidCard>
  )
}
