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
  const heightClass = variant === "compact" ? "h-14" : "h-16"

  return (
    <header
      className={cn(
        "web-nav z-sticky",
        sticky ? "sticky top-0" : "",
        className
      )}
    >
      <div className={cn("web-nav-inner", heightClass)}>
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
