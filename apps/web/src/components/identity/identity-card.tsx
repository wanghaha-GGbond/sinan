"use client"

import { useState } from "react"

// ---------------------------------------------------------------------------
// Card material config — materials keyed by trustLevel.
// Never show "L1/L2/L3" labels; use material cues only.
// ---------------------------------------------------------------------------

type CardMaterial = {
  outer: string         // card wrapper gradient/bg
  inner: string         // inner surface (front content area)
  accent: string        // divider / glyph colour
  nameText: string
  metaText: string
  backBg: string
  backText: string
  backAccent: string
  label: string         // human-readable material name shown to screen readers only
}

const MATERIALS: Record<number, CardMaterial> = {
  0: {
    outer: "bg-gradient-to-br from-neutral-200 to-neutral-300 shadow-md",
    inner: "bg-neutral-100/70",
    accent: "text-neutral-400",
    nameText: "text-neutral-500",
    metaText: "text-neutral-400",
    backBg: "bg-neutral-200",
    backText: "text-neutral-500",
    backAccent: "text-neutral-400",
    label: "paper",
  },
  1: {
    outer: "bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg shadow-slate-900/40",
    inner: "bg-slate-800/60 backdrop-blur-sm",
    accent: "text-slate-400",
    nameText: "text-slate-100",
    metaText: "text-slate-400",
    backBg: "bg-slate-800",
    backText: "text-slate-200",
    backAccent: "text-slate-400",
    label: "matte",
  },
  2: {
    outer: "bg-gradient-to-br from-slate-400 via-slate-300 to-slate-500 shadow-xl shadow-slate-400/30",
    inner: "bg-white/20 backdrop-blur-sm",
    accent: "text-slate-600",
    nameText: "text-slate-900",
    metaText: "text-slate-700",
    backBg: "bg-slate-300/80",
    backText: "text-slate-800",
    backAccent: "text-slate-600",
    label: "metallic",
  },
  3: {
    outer: "bg-gradient-to-br from-stone-900 via-yellow-900 to-stone-950 shadow-2xl shadow-yellow-900/30",
    inner: "bg-black/30 backdrop-blur-sm",
    accent: "text-yellow-500",
    nameText: "text-yellow-50",
    metaText: "text-yellow-300/80",
    backBg: "bg-stone-900/80",
    backText: "text-yellow-100",
    backAccent: "text-yellow-500",
    label: "black-gold",
  },
}

function getMaterial(trustLevel: number): CardMaterial {
  return MATERIALS[Math.min(trustLevel, 3)] ?? MATERIALS[0]
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IdentityCardData = {
  displayName: string
  trustLevel: number
  companyName?: string
  jobBand?: string
  yearsOfExperience?: number
  reputationScore?: number
  usefulCount?: number
  thankedCount?: number
  highlightMoment?: string
  declinedOffer?: string
  inviterName?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IdentityCard({ data, className = "" }: { data: IdentityCardData; className?: string }) {
  const [flipped, setFlipped] = useState(false)
  const m = getMaterial(data.trustLevel)

  return (
    <div
      className={`relative h-48 w-80 cursor-pointer select-none ${className}`}
      style={{ perspective: "1000px" }}
      onClick={() => setFlipped((v) => !v)}
      role="button"
      tabIndex={0}
      aria-label={`身份卡 — 点击翻面`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped((v) => !v) } }}
    >
      <div
        className="relative h-full w-full transition-transform duration-500"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front */}
        <div
          className={`absolute inset-0 rounded-2xl p-px ${m.outer}`}
          style={{ backfaceVisibility: "hidden" }}
          aria-label={`${m.label} 材质身份卡正面`}
        >
          <div className={`h-full w-full rounded-[calc(1rem-1px)] p-5 flex flex-col justify-between ${m.inner}`}>
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-xs font-medium tracking-widest uppercase opacity-60 ${m.accent}`}>司南</p>
                <p className={`mt-1 text-xl font-semibold tracking-tight ${m.nameText}`}>{data.displayName}</p>
              </div>
              {data.trustLevel > 0 && (
                <div className={`flex size-8 items-center justify-center rounded-full border ${data.trustLevel >= 3 ? "border-yellow-500/50 text-yellow-500" : data.trustLevel >= 2 ? "border-slate-400/50 text-slate-500" : "border-slate-500/30 text-slate-400"}`}>
                  <span className="text-xs font-bold">✓</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className={`h-px w-full opacity-20 ${data.trustLevel >= 3 ? "bg-yellow-400" : "bg-current"}`} />

            {/* Bottom row */}
            <div>
              {data.companyName ? (
                <p className={`text-sm font-medium ${m.nameText}`}>{data.companyName}</p>
              ) : (
                <p className={`text-sm italic opacity-50 ${m.metaText}`}>未认证</p>
              )}
              <div className={`mt-1 flex flex-wrap gap-x-3 text-xs ${m.metaText}`}>
                {data.jobBand && <span>{data.jobBand}</span>}
                {data.yearsOfExperience != null && <span>{data.yearsOfExperience} 年经验</span>}
              </div>
              {data.inviterName && (
                <p className={`mt-2 text-xs opacity-50 ${m.metaText}`}>由 {data.inviterName} 引荐</p>
              )}
              {data.highlightMoment && (
                <p className={`mt-2 truncate text-xs ${m.metaText}`}>{data.highlightMoment}</p>
              )}
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className={`absolute inset-0 rounded-2xl p-px ${m.outer}`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          aria-label={`身份卡背面 — 匿名声誉`}
        >
          <div className={`h-full w-full rounded-[calc(1rem-1px)] p-5 flex flex-col justify-between ${m.backBg}`}>
            <div>
              <p className={`text-xs font-medium tracking-widest uppercase opacity-60 ${m.backAccent}`}>匿名声誉</p>
              <p className={`mt-1 text-xs opacity-50 ${m.backText}`}>以下数据不关联真实身份</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className={`text-3xl font-bold ${m.backText}`}>{data.reputationScore ?? 0}</p>
                <p className={`mt-0.5 text-xs opacity-60 ${m.backAccent}`}>声誉分</p>
              </div>
              <div>
                <p className={`text-3xl font-bold ${m.backText}`}>{data.usefulCount ?? 0}</p>
                <p className={`mt-0.5 text-xs opacity-60 ${m.backAccent}`}>有用票</p>
              </div>
              <div>
                <p className={`text-3xl font-bold ${m.backText}`}>{data.thankedCount ?? 0}</p>
                <p className={`mt-0.5 text-xs opacity-60 ${m.backAccent}`}>被感谢</p>
              </div>
            </div>

            <p className={`truncate text-xs opacity-50 ${m.backText}`}>
              {data.declinedOffer ? `拒绝陈列：${data.declinedOffer}` : "点击翻回正面"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
