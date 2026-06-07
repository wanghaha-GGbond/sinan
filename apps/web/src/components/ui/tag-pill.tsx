import { cva, type VariantProps } from "class-variance-authority"
import type { HTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils"

const tagPillVariants = cva("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", {
  variants: {
    tone: {
      positive: "border-primary-surface-border bg-secondary text-secondary-foreground",
      match: "border-primary-surface-border bg-secondary text-secondary-foreground",
      neutral: "border-tw-mute bg-muted text-foreground",
      risk: "border-risk-border bg-risk-surface text-destructive",
    },
    selected: {
      true: "ring-1 ring-primary/40",
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
