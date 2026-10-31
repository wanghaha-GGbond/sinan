import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const solidCardVariants = cva("@container web-surface", {
  variants: {
    variant: {
      default: "web-surface-base",
      subtle: "web-surface-base",
      elevated: "web-surface-raised",
      emerald: "web-surface-tint",
      risk: "web-surface-risk",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

export interface SolidCardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof solidCardVariants> {}

export function SolidCard({ className, variant, ...props }: SolidCardProps) {
  return <div className={cn(solidCardVariants({ variant }), className)} {...props} />
}
