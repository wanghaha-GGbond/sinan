import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const solidCardVariants = cva("border border-[#E5E7DB]/60", {
  variants: {
    variant: {
      default: "solid-card",
      subtle: "solid-card-subtle",
      elevated:
        "rounded-[30px] bg-white shadow-[0_10px_0_rgba(17,24,39,0.055),0_24px_48px_rgba(17,24,39,0.08)]",
      emerald:
        "rounded-[28px] border-[#BDEDDD]/70 bg-[#F0FFF7] shadow-[0_8px_0_rgba(14,143,95,0.08),0_18px_36px_rgba(14,143,95,0.08)]",
      risk: "rounded-[28px] border-[#FCD9A6]/70 bg-[#FFF1D6] shadow-[0_8px_0_rgba(146,64,14,0.08),0_18px_36px_rgba(146,64,14,0.08)]",
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

