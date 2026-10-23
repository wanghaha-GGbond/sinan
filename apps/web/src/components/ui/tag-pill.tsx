import { cva, type VariantProps } from "class-variance-authority"
import type { HTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils"

const tagPillVariants = cva("inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-xs font-medium", {
  variants: {
    tone: {
      positive: "border-border bg-muted text-muted-foreground",
      match: "border-border bg-muted text-muted-foreground",
      neutral: "border-tw-mute bg-muted text-foreground",
      risk: "border-risk-border bg-risk-surface text-destructive",
    },
    selected: {
      true: "border-primary-surface-border bg-primary-tint text-primary-deep",
      false: "",
    },
  },
  defaultVariants: {
    tone: "neutral",
    selected: false,
  },
})

export function TagPill({
  children,
  tone,
  selected,
  className,
  ...props
}: { children: ReactNode } & VariantProps<typeof tagPillVariants> & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span {...props} className={cn(tagPillVariants({ tone, selected }), className)}>
      {children}
    </span>
  )
}
