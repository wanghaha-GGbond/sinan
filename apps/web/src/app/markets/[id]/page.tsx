"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

const LEGAL_NOTICE =
  "封闭内测 · 不接真钱 · 不构成投资建议 · 仅用站内积分,亏完不充值"
const BET_MAX = 100

type MarketDetail = {
  market: {
    id: string
    title: string
    description: string
    status: string
    outcomes: string[]
    closesAt: string
    resolvedOutcome: number | null
  }
  tally: Array<{
    outcome: string
    betCount: number
    totalPoints: number
  }>
}

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<MarketDetail | null>(null)
  const [outcome, setOutcome] = useState<string>("")
  const [points, setPoints] = useState<number>(10)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/markets/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        if (d?.market?.outcomes?.length) setOutcome(d.market.outcomes[0])
      })
      .catch(() => {})
  }, [id])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const res = await fetch(`/api/markets/${id}/bet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, pointsBet: points }),
    })
    if (res.status === 401) {
      router.push(`/login?next=/markets/${id}`)
      return
    }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setMessage(d.error ?? "下注失败")
      return
    }
    setMessage("已下注")
    fetch(`/api/markets/${id}`)
      .then((r) => r.json())
      .then((d) => setData(d))
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12 text-sm">加载中…</div>
    )
  }

  const isOpen = data.market.status === "open"

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="bg-destructive/10 text-destructive mb-6 rounded-2xl border px-4 py-3 text-xs font-medium">
        {LEGAL_NOTICE}
      </div>

      <h1 className="text-3xl font-semibold">{data.market.title}</h1>
      <p className="text-muted-foreground mt-2 text-xs">
        状态:{data.market.status} · 截止:
        {new Date(data.market.closesAt).toLocaleString("zh-CN")}
      </p>
      <p className="text-foreground mt-4 text-base">{data.market.description}</p>

      <section className="mt-8">
        <h2 className="text-foreground text-xl font-semibold">票数</h2>
        <ul className="mt-3 space-y-2">
          {data.tally.map((t) => (
            <li
              key={t.outcome}
              className="bg-card flex items-center justify-between rounded-2xl border p-3 text-sm"
            >
              <span className="text-foreground">{t.outcome}</span>
              <span className="text-muted-foreground text-xs">
                {t.betCount} 票 · {t.totalPoints} points
              </span>
            </li>
          ))}
          {data.tally.length === 0 && (
            <li className="text-muted-foreground text-sm">暂无下注</li>
          )}
        </ul>
      </section>

      {isOpen && (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <h2 className="text-foreground text-xl font-semibold">下注</h2>
          <div className="flex flex-wrap gap-3">
            {data.market.outcomes.map((o) => (
              <label
                key={o}
                className="bg-card flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm"
              >
                <input
                  type="radio"
                  name="outcome"
                  value={o}
                  checked={outcome === o}
                  onChange={() => setOutcome(o)}
                />
                {o}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={BET_MAX}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="bg-background w-24 rounded-2xl border p-2 text-sm"
            />
            <span className="text-muted-foreground text-xs">points</span>
            <button
              type="submit"
              className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm"
            >
              下注
            </button>
          </div>
          {message && (
            <div className="text-muted-foreground text-xs">{message}</div>
          )}
        </form>
      )}
    </div>
  )
}