"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"

/**
 * 情绪指数分享卡生成器 (04 §1.3)。
 *
 * 实时生成 1200×630 PNG,运营 / 媒体直接拿去用。URL 长这样:
 *   /api/og/sentiment?company=字节跳动&score=85&invite=ABC12345&inviter=王二狗
 *
 * 如果用户没填邀请人 / 邀请码,水印位会回退到产品名(避免空画面)。
 */
export function PressShareCardGenerator() {
  const router = useRouter()
  const [company, setCompany] = useState("字节跳动")
  const [score, setScore] = useState(85)
  const [trend, setTrend] = useState<"up" | "down">("up")
  const [invite, setInvite] = useState("")
  const [inviter, setInviter] = useState("")

  const params = new URLSearchParams()
  if (company.trim()) params.set("company", company.trim())
  if (Number.isFinite(score)) params.set("score", String(score))
  params.set("trend", trend)
  if (invite.trim()) params.set("invite", invite.trim())
  if (inviter.trim()) params.set("inviter", inviter.trim())
  const imageUrl = `/api/og/sentiment?${params.toString()}`

  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${imageUrl}` : imageUrl
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle")

  async function copy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return
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
    <SolidCard variant="elevated" className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">情绪指数分享卡</h2>
        <TagPill tone="match">1200×630 PNG</TagPill>
        <TagPill tone="neutral">可带邀请码水印</TagPill>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        填表 → 实时出图 → 复制图片 URL 直接分享到群里。这是 M2 引爆期
        用的核心物料。
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <div className="grid gap-3">
          <Field label="公司名" value={company} onChange={setCompany} />
          <Field
            label="情绪指数 (0-100)"
            value={String(score)}
            onChange={(v) => setScore(Math.max(0, Math.min(100, Number(v) || 0)))}
            type="number"
          />
          <div className="grid gap-1 text-xs font-medium text-foreground">
            <span>趋势</span>
            <div className="flex gap-2">
              {(["up", "down"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setTrend(opt)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    trend === opt
                      ? "bg-foreground text-white"
                      : "bg-muted text-foreground hover:bg-muted-hover"
                  }`}
                >
                  {opt === "up" ? "本周上升" : "本周下降"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="邀请码 (可选)"
              value={invite}
              onChange={setInvite}
              placeholder="ABC12345"
            />
            <Field
              label="邀请人 (可选)"
              value={inviter}
              onChange={setInviter}
              placeholder="王二狗"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SolidButton type="button" size="sm" onClick={copy} data-testid="press-copy-image-url">
              {copied === "ok" ? "已复制 URL" : copied === "fail" ? "复制失败" : "复制图片 URL"}
            </SolidButton>
            <a
              href={imageUrl}
              download="sinan-share.png"
              className="text-xs font-semibold text-primary-deep hover:underline"
            >
              下载 PNG
            </a>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              <Loader2 className="mr-1 inline size-3" />
              重新出图
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            URL 示例: <code className="rounded bg-white px-1.5 py-0.5">{fullUrl}</code>
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- OG image is dynamic; preview is not SSR-critical */}
          <img
            src={imageUrl}
            alt="司南情绪指数分享卡预览"
            width={1200}
            height={630}
            className="block w-full"
          />
        </div>
      </div>
    </SolidCard>
  )
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: "text" | "number"
  placeholder?: string
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-foreground">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[14px] border border-border/60 bg-white px-3 py-2 text-sm shadow-[0_3px_0_rgba(17,24,39,0.04)]"
      />
    </label>
  )
}
