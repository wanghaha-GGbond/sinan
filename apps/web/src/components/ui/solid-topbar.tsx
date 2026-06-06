"use client"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type SolidTopbarVariant = "home" | "default" | "compact"

export function SolidTopbar({
  title,
  subtitle,
  leftSlot,
  rightSlot,
  variant = "default",
  sticky = true,
  className,
}: {
  title: string
  subtitle?: string
  leftSlot?: ReactNode
  rightSlot?: ReactNode
  variant?: SolidTopbarVariant
  sticky?: boolean
  className?: string
}) {
  const heightClass = variant === "compact" ? "h-[54px]" : "h-[58px]"

  return (
    <header
      className={cn(
        "z-sticky border-b border-border/50 bg-background/95 shadow-[0_4px_0_rgba(17,24,39,0.025)]",
        sticky ? "sticky top-0" : "",
        className
      )}
    >
      <div className={cn("mx-auto flex w-full max-w-[920px] items-center justify-between px-4 sm:px-6", heightClass)}>
        <div className="min-w-0">
          {leftSlot ? (
            leftSlot
          ) : (
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
              {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
            </div>
          )}
        </div>
        <div className="shrink-0">{rightSlot}</div>
      </div>
    </header>
  )
}

