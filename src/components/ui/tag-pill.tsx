import { cva, type VariantProps } from "class-variance-authority"
import type { HTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils"

const tagPillVariants = cva("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", {
  variants: {
    tone: {
      positive: "border-[#BDEDDD] bg-[#DFF8EC] text-[#07563A]",
      match: "border-[#BDEDDD] bg-[#DFF8EC] text-[#07563A]",
      neutral: "border-[#DDE5E1] bg-[#F1F5EF] text-[#1F2937]",
      risk: "border-[#FCD9A6] bg-[#FFF1D6] text-[#92400E]",
    },
    selected: {
      true: "ring-1 ring-[#19C37D]/40",
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
