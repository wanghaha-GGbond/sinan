"use client"

/**
 * Animated score chip — used in the company hero and the
 * recommendations feed. The number animates from 0 to its
 * final value on mount, with a small spring that lands in
 * ~700ms. Respects prefers-reduced-motion (snaps to final
 * value). The reason: a number that physically settles
 * signals "data just arrived" much more strongly than one
 * that just appears. Linear / Vercel / Stripe do this on
 * their dashboards.
 */
import { useEffect, useState } from "react"
import { animate, useMotionValue, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"
import type { HTMLAttributes } from "react"

export function ScoreChip({
  score,
  label = "方向分",
  compact = false,
  className,
  ...props
}: {
  score: number
  label?: string
  compact?: boolean
  className?: string
} & HTMLAttributes<HTMLDivElement>) {
  const reduced = useReducedMotion()
  const motionValue = useMotionValue(score)
  // Lazy initial state: if the user has reduced motion, start
  // at the final score (no animation); otherwise start at 0
  // and animate up. When score prop changes mid-life (e.g. user
  // switches between companies in a list), the effect below
  // re-runs the count-up from 0 → new score. useState's lazy
  // init avoids the lint rule about calling setState inside
  // effects for the initial render.
  const [display, setDisplay] = useState(() => (reduced ? score : 0))

  useEffect(() => {
    if (reduced) return
    const controls = animate(motionValue, score, {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1], // ease-out-expo
      onUpdate: (latest) => setDisplay(latest),
    })
    return () => controls.stop()
    // motionValue is stable, only re-animate when score changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, reduced])

  // Reduced-motion path: render the live `score` prop directly,
  // not the animated `display` state. This keeps the number
  // correct when the prop changes (e.g. switching companies)
  // without needing to call setState inside an effect.
  const rendered = reduced ? score : display

  return (
    <div
      {...props}
      className={cn(
        "rounded-full bg-foreground text-background shadow-[0_4px_0_rgba(17,24,39,0.22)]",
        compact ? "px-2.5 py-1 text-xs font-semibold" : "px-3 py-2",
        className
      )}
      data-testid="score-chip"
    >
      <p className={cn("text-slate-300", compact ? "text-[10px]" : "text-[11px]")}>{label}</p>
      <p className={cn("font-semibold tabular-nums", compact ? "text-sm" : "text-lg")}>
        {rendered.toFixed(1)}
      </p>
    </div>
  )
}
