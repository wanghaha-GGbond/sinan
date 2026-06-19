"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Heart, Trophy } from "lucide-react"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { formatPrice } from "@/lib/server/auction-view"

// ---------------------------------------------------------------------------
// Settle by highest bid
// ---------------------------------------------------------------------------

export function SettleDefaultButton({ auctionId }: { auctionId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  async function handle() {
    if (!confirm("确认默认最高价成交？成交后无法撤回。")) return
    setBusy(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/auctions/${auctionId}/settle-default`, {
        method: "POST",
        credentials: "include",
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setFeedback({ ok: false, message: data.error ?? `HTTP ${res.status}` })
        return
      }
      setFeedback({ ok: true, message: "成交成功！正在跳转…" })
      router.refresh()
    } catch (e: unknown) {
      setFeedback({ ok: false, message: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <SolidButton
        type="button"
        variant="primary"
        size="sm"
        onClick={handle}
        disabled={busy}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Trophy className="size-4" />}
        默认最高价成交
      </SolidButton>
      {feedback ? (
        <p className={`text-xs ${feedback.ok ? "text-primary" : "text-destructive"}`}>
          {feedback.message}
        </p>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Heart pick button per bid
// ---------------------------------------------------------------------------

export function HeartPickButton({
  auctionId,
  bidId,
}: {
  auctionId: string
  bidId: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function handle() {
    if (!confirm("确认行使心动权选中此出价人？成交后无法撤回。")) return
    setBusy(true)
    try {
      const res = await fetch(`/api/auctions/${auctionId}/heart-pick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bidId }),
      })
      if (res.ok) {
        setDone(true)
        router.refresh()
      }
    } catch {
      // ignore
    } finally {
      setBusy(false)
    }
  }

  return (
    <SolidButton
      type="button"
      variant="secondary"
      size="sm"
      onClick={handle}
      disabled={busy || done}
    >
      {done ? (
        "已选中 ✓"
      ) : busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <>
          <Heart className="size-3.5" />
          心动
        </>
      )}
    </SolidButton>
  )
}

// ---------------------------------------------------------------------------
// Bid withdraw button (for bidder in detail page)
// ---------------------------------------------------------------------------

export function WithdrawBidButton({
  auctionId,
  bidId,
}: {
  auctionId: string
  bidId: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function handle() {
    if (!confirm("确认撤回出价？")) return
    setBusy(true)
    try {
      const res = await fetch(
        `/api/auctions/${auctionId}/bids/${bidId}/withdraw`,
        { method: "POST", credentials: "include" }
      )
      if (res.ok) {
        setDone(true)
        router.refresh()
      }
    } catch {
      // ignore
    } finally {
      setBusy(false)
    }
  }

  return (
    <SolidButton
      type="button"
      variant="secondary"
      size="sm"
      onClick={handle}
      disabled={busy || done}
    >
      {done ? "已撤回" : busy ? <Loader2 className="size-4 animate-spin" /> : "撤回出价"}
    </SolidButton>
  )
}

// ---------------------------------------------------------------------------
// ClosedManage — composite component replacing the server-rendered section
// ---------------------------------------------------------------------------

type BidRow = {
  id: string
  bidderTrustLevel: number
  bidderJobBand: string | null
  amountCents: number
  reasonText: string
  status: string
  createdAt: string
}

export function ClosedManageClient({
  auctionId,
  bids,
}: {
  auctionId: string
  bids: BidRow[]
}) {
  return (
    <>
      <SolidCard variant="elevated" className="p-6">
        <h2 className="text-base font-semibold">选标</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          截拍后 72 小时内行使心动权，或选择默认最高价成交。
        </p>
        <div className="mt-4">
          <SettleDefaultButton auctionId={auctionId} />
        </div>
      </SolidCard>

      <SolidCard variant="subtle" className="p-6">
        <h3 className="text-base font-semibold">
          候选出价（共 {bids.length} 条）
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          每条候选的金额仅嘉宾本人可见（用于排序）；公开页面只显示段位和「为什么是我」。
        </p>
        <ul className="mt-4 space-y-3">
          {bids.map((bid) => (
            <li
              key={bid.id}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>L{bid.bidderTrustLevel}</span>
                  {bid.bidderJobBand ? <span>· {bid.bidderJobBand}</span> : null}
                  <span className="ml-2 font-semibold text-foreground">
                    {formatPrice(bid.amountCents)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground">
                  {bid.reasonText.slice(0, 60)}
                  {bid.reasonText.length > 60 ? "…" : ""}
                </p>
              </div>
              <HeartPickButton auctionId={auctionId} bidId={bid.id} />
            </li>
          ))}
          {bids.length === 0 ? (
            <li className="text-sm text-muted-foreground">
              暂无 active 出价，可直接走默认最高价（将流拍）。
            </li>
          ) : null}
        </ul>
      </SolidCard>
    </>
  )
}
