"use client"

/**
 * Client-side auction list + bid form for /auction.
 *
 * Why this lives in a single client component:
 *   - the list is fetched from /api/auctions with revalidate-on-mount
 *   - the bid form is shown inline when a user picks an auction
 *   - splitting fetch (server) and form (client) would require a router
 *     transition per bid pick; for an M2 form-level page that's overkill
 *
 * Anonymity: bid counts are visible (spec §2.2 — "互相看不到出价,
 * 只看到参与人数"). Amounts and bidder identities are never shown
 * pre-settle.
 */
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, ShieldCheck } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"
import { useAuth } from "@/lib/auth-context"
import { Countdown } from "@/components/auction/countdown"

type AuctionItem = {
  id: string
  hostDisplayName: string
  hostTrustLevel: number
  hostCompanyName: string | null
  scenarioTitle: string
  scenarioDesc: string
  durationMinutes: number
  guidePriceMinLabel: string
  guidePriceMaxLabel: string
  guidePriceMinCents: number
  guidePriceMaxCents: number
  charityFlag: boolean
  status: "draft" | "live" | "closed" | "settled" | "cancelled"
  startsAt: string
  endsAt: string
  bidCount: number
  isLive: boolean
  isEnded: boolean
}

export function AuctionList() {
  const router = useRouter()
  const { user } = useAuth()
  const [items, setItems] = useState<AuctionItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    // Defer setState to a macrotask to satisfy react-hooks/set-state-in-effect
    // (we're using setError purely as a "start fresh fetch" trigger).
    const handle = window.setTimeout(() => {
      if (cancelled) return
      setError(null)
      fetch("/api/auctions", { credentials: "include" })
        .then(async (res) => {
          const data = (await res.json()) as { auctions?: AuctionItem[]; error?: string }
          if (cancelled) return
          if (!res.ok) {
            setError(data.error ?? "读取失败")
            setItems([])
            return
          }
          setItems(data.auctions ?? [])
        })
        .catch((e: unknown) => {
          if (cancelled) return
          setError(e instanceof Error ? e.message : String(e))
          setItems([])
        })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [refreshKey])

  const grouped = useMemo(() => {
    if (!items) return { live: [], upcoming: [], settled: [] }
    const live: AuctionItem[] = []
    const upcoming: AuctionItem[] = []
    const settled: AuctionItem[] = []
    for (const item of items) {
      if (item.isLive) live.push(item)
      else if (item.status === "settled" || item.isEnded) settled.push(item)
      else upcoming.push(item)
    }
    return { live, upcoming, settled }
  }, [items])

  if (items === null && !error) {
    return (
      <SolidCard variant="subtle" className="p-5 text-sm text-muted-foreground">
        <Loader2 className="mr-2 inline-block size-4 animate-spin" />
        正在读取专场…
      </SolidCard>
    )
  }

  if (error) {
    return (
      <SolidCard variant="risk" className="p-5">
        <p className="text-sm font-semibold text-foreground">暂时读不到专场</p>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          没有数据库或未发布专场时,这一页会显示空白。等运营季开拍,这里会出现 10 场盲拍。
        </p>
      </SolidCard>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <Section title="进行中" emptyText="本季还没有进行中的专场,关注社区公告">
        {grouped.live.map((item) => (
          <AuctionRow
            key={item.id}
            item={item}
            selected={selectedId === item.id}
            onSelect={() => {
              setSelectedId(item.id)
              if (typeof window !== "undefined") {
                window.location.hash = `bid-${item.id}`
              }
            }}
            onLoginRequired={() => router.push("/login")}
            isAuthed={Boolean(user)}
          />
        ))}
      </Section>

      <Section title="即将开拍" emptyText="下一季 10 场正在邀约嘉宾中">
        {grouped.upcoming.map((item) => (
          <AuctionRow
            key={item.id}
            item={item}
            selected={false}
            onSelect={() => undefined}
            onLoginRequired={() => router.push("/login")}
            isAuthed={Boolean(user)}
          />
        ))}
      </Section>

      <Section title="已落槌" emptyText="首季进行中,稍后这里会显示成交记录">
        {grouped.settled.map((item) => (
          <SettledRow key={item.id} item={item} />
        ))}
      </Section>

      <div className="flex justify-end">
        <button
          type="button"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setRefreshKey((k) => k + 1)}
        >
          刷新
        </button>
      </div>
    </div>
  )
}

function Section({
  title,
  emptyText,
  children,
}: {
  title: string
  emptyText: string
  children: React.ReactNode[]
}) {
  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-foreground">{title}</h2>
      {children.length > 0 ? (
        <div className="grid gap-3">{children}</div>
      ) : (
        <SolidCard variant="subtle" className="p-4 text-sm text-muted-foreground">
          {emptyText}
        </SolidCard>
      )}
    </div>
  )
}

function AuctionRow({
  item,
  selected,
  onSelect,
  onLoginRequired,
  isAuthed,
}: {
  item: AuctionItem
  selected: boolean
  onSelect: () => void
  onLoginRequired: () => void
  isAuthed: boolean
}) {
  return (
    <SolidCard
      variant={selected ? "elevated" : "subtle"}
      className="p-5"
      data-testid={`auction-row-${item.id}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TagPill tone="match">{item.scenarioTitle}</TagPill>
            <TagPill tone="neutral">{item.durationMinutes} 分钟</TagPill>
            {item.charityFlag ? <TagPill tone="neutral">全捐</TagPill> : null}
            <span className="text-xs text-muted-foreground">
              {item.bidCount} 人出价
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-foreground">
            {item.scenarioDesc}
          </h3>
          <p className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
            <span>嘉宾 {item.hostDisplayName}</span>
            {item.hostCompanyName ? <span>· {item.hostCompanyName}</span> : null}
            <span>· 段位 L{item.hostTrustLevel} 验证</span>
            <span>· 指导价 {item.guidePriceMinLabel} - {item.guidePriceMaxLabel}</span>
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
            <span>{formatRange(item.startsAt, item.endsAt)}</span>
            {item.isLive && (
              <Countdown endsAt={item.endsAt} className="font-medium text-primary" />
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <SolidButton
            type="button"
            size="sm"
            onClick={() => {
              if (!isAuthed) {
                onLoginRequired()
                return
              }
              onSelect()
            }}
            data-testid={`auction-pick-${item.id}`}
          >
            {selected ? "已选中,下方出价" : "我要报名"}
          </SolidButton>
          <Link
            href={`/auction/${item.id}`}
            className="text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            查看详情
          </Link>
        </div>
      </div>

      {selected ? <AuctionBidForm /> : null}
    </SolidCard>
  )
}

function SettledRow({ item }: { item: AuctionItem }) {
  return (
    <Link href={`/auction/${item.id}`} className="block">
      <SolidCard variant="subtle" className="p-4 hover:bg-card transition-colors">
        <p className="text-sm font-semibold text-foreground">{item.scenarioTitle}</p>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{item.scenarioDesc}</p>
        <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          <span>嘉宾 {item.hostDisplayName}</span>
          {item.hostCompanyName ? <span>· {item.hostCompanyName}</span> : null}
          <span>· {item.bidCount} 人参与</span>
        </p>
      </SolidCard>
    </Link>
  )
}

function formatRange(startsAt: string, endsAt: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  return `开拍 ${fmt(startsAt)} → 截拍 ${fmt(endsAt)}`
}

// ---------------------------------------------------------------------------
// Bid form
// ---------------------------------------------------------------------------

export function AuctionBidForm() {
  // Render a single shared form. The selected auction is read from the
  // URL hash (#bid-<id>). If no auction is picked, the form is hidden.
  const [auctionId, setAuctionId] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window === "undefined") return
    const update = () => {
      const m = window.location.hash.match(/^#bid-([\w-]+)$/)
      setAuctionId(m ? m[1] : null)
    }
    update()
    window.addEventListener("hashchange", update)
    return () => window.removeEventListener("hashchange", update)
  }, [])

  if (!auctionId) return null

  return <AuctionBidFormInner auctionId={auctionId} />
}

function AuctionBidFormInner({ auctionId }: { auctionId: string }) {
  const { user } = useAuth()
  const [amountYuan, setAmountYuan] = useState<string>("")
  const [reasonText, setReasonText] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  const reasonCount = reasonText.length
  const reasonValid = reasonCount >= 10 && reasonCount <= 200

  if (!user) {
    return (
      <SolidCard variant="risk" className="mt-4 p-4">
        <p className="text-sm font-semibold text-foreground">出价前请先登录</p>
        <p className="mt-1 text-xs text-muted-foreground">
          登录后还要完成邮箱验证(L1)才能出价。
        </p>
      </SolidCard>
    )
  }

  if ((user.trustLevel ?? 0) < 1) {
    return (
      <SolidCard variant="risk" className="mt-4 p-4">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">完成 L1 验证后即可出价</p>
            <p className="mt-1 text-xs text-muted-foreground">
              司南是打工人社区——拍卖的嘉宾和竞拍者都需要先做最基本的身份验证。
            </p>
          </div>
        </div>
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
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        bidId?: string
      }
      if (!res.ok) {
        setFeedback({ ok: false, message: data.error ?? `HTTP ${res.status}` })
        return
      }
      setFeedback({ ok: true, message: "出价已提交。盲拍期间互相看不到金额,只看到参与人数。" })
      setAmountYuan("")
      setReasonText("")
    } catch (e: unknown) {
      setFeedback({ ok: false, message: e instanceof Error ? e.message : String(e) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-border/70 bg-muted p-4">
      <h4 className="text-sm font-semibold text-foreground">出价(盲拍)</h4>
      <p className="mt-1 text-xs text-muted-foreground">
        你提交后,这一场其他人都看不到你的出价;截拍后嘉宾会在全部候选里选一个人(心动权)。
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-medium text-foreground">
          金额(元)
          <input
            type="number"
            min="1"
            step="1"
            value={amountYuan}
            onChange={(e) => setAmountYuan(e.target.value)}
            className="rounded-[14px] border border-border/60 bg-white px-3 py-2 text-sm shadow-[0_3px_0_rgba(17,24,39,0.04)]"
            placeholder="500"
            data-testid="auction-bid-amount"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-foreground sm:col-span-2">
          为什么是我(10-200 字)
          <textarea
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            rows={3}
            className="rounded-[14px] border border-border/60 bg-white px-3 py-2 text-sm shadow-[0_3px_0_rgba(17,24,39,0.04)]"
            placeholder="我现在在 / 想问 / 行业 / 这次对话能帮我..."
            data-testid="auction-bid-reason"
          />
          <span
            className={`text-[10px] ${reasonValid ? "text-muted-foreground" : "text-destructive"}`}
            aria-live="polite"
          >
            {reasonCount} / 200
          </span>
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          提交即同意 M2 全捐约定。
        </p>
        <SolidButton
          type="button"
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
          className={`mt-2 text-xs ${feedback.ok ? "text-primary-deep" : "text-destructive"}`}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  )
}
