"use client"

import { useEffect, useState } from "react"

type SentimentPoint = { date: string; score: number; sampleCount: number }
type CompanyEvent = { date: string; title: string; category: string; sourceUrl: string | null }

type Props = {
  companyId: string
  companyName: string
}

export function SentimentTrend({ companyId, companyName }: Props) {
  const [points, setPoints] = useState<SentimentPoint[]>([])
  const [events, setEvents] = useState<CompanyEvent[]>([])
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle")

  useEffect(() => {
    let active = true
    fetch(`/api/companies/${companyId}/sentiment`)
      .then((response) => response.json())
      .then((result: { points?: SentimentPoint[]; events?: CompanyEvent[] }) => {
        if (active) {
          setPoints(result.points ?? [])
          setEvents(result.events ?? [])
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [companyId])

  if (points.length === 0) return null
  const latest = points[points.length - 1]
  const prev = points.length > 1 ? points[points.length - 2] : null
  const trend = prev && latest.score < prev.score ? "down" : "up"

  // Build the share card URL. We DO NOT bake an invite code into the
  // link by default — the viewer is whoever you sent it to, not
  // necessarily someone who'll use your invite. The watermark on the
  // generated image can carry an invite if the viewer later visits
  // /invite/<code> first (the landing page re-emits the share URL
  // with ?invite= baked in).
  const shareUrl = `/api/og/sentiment?company=${encodeURIComponent(companyName)}&score=${latest.score}&trend=${trend}`

  async function share() {
    if (typeof window === "undefined") return
    const fullUrl = `${window.location.origin}${shareUrl}`
    const payload: ShareData = {
      title: `${companyName} · 职场情绪指数`,
      text: `${companyName} 本周情绪 ${latest.score.toFixed(1)}。`,
      url: fullUrl,
    }
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(payload)
        return
      } catch {
        // user cancelled or share unavailable — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied("ok")
      window.setTimeout(() => setCopied("idle"), 1800)
    } catch {
      setCopied("fail")
      window.setTimeout(() => setCopied("idle"), 1800)
    }
  }

  return (
    <section className="my-5 border-y border-border py-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">职场情绪指数</h2>
          <p className="mt-1 text-xs text-muted-foreground">近 90 天每日聚合</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-3xl font-semibold text-foreground">{latest.score.toFixed(1)}</p>
          <button
            type="button"
            onClick={share}
            data-testid="sentiment-share-button"
            className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-hover"
          >
            {copied === "ok" ? "已复制" : copied === "fail" ? "复制失败" : "分享"}
          </button>
        </div>
      </div>
      <div className="mt-5 flex h-32 items-end gap-1" aria-label="情绪指数趋势">
        {points.map((point) => (
          <div
            key={point.date}
            title={`${point.date}: ${point.score}`}
            className="min-w-1 flex-1 bg-primary/70"
            style={{ height: `${Math.max(8, point.score)}%` }}
          />
        ))}
      </div>
      {events.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {events.map((event) => (
            <span key={`${event.date}-${event.title}`} className="border border-border px-2 py-1 text-xs text-muted-foreground">
              {event.date} · {event.title}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  )
}
