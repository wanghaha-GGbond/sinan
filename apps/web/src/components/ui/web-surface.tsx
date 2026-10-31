import * as React from "react"

import { cn } from "@/lib/utils"

export type WebSurfaceTone =
  | "base"
  | "raised"
  | "overlay"
  | "tint"
  | "risk"
  // Compatibility aliases for the remaining pages being migrated.
  | "default"
  | "subtle"
  | "elevated"
  | "emerald"

export function WebSurface({
  tone = "base",
  variant,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: WebSurfaceTone; variant?: WebSurfaceTone }) {
  const resolvedTone = variant ?? tone
  return <div className={cn("web-surface", `web-surface-${resolvedTone}`, className)} {...props} />
}
