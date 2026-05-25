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
  return (
    <div
      {...props}
      className={cn(
        "rounded-full bg-[#111827] text-white shadow-[0_4px_0_rgba(17,24,39,0.22)]",
        compact ? "px-2.5 py-1 text-xs font-semibold" : "px-3 py-2",
        className
      )}
    >
      <p className={cn("text-slate-300", compact ? "text-[10px]" : "text-[11px]")}>{label}</p>
      <p className={cn("font-semibold", compact ? "text-sm" : "text-lg")}>{score.toFixed(1)}</p>
    </div>
  )
}
