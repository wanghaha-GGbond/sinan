import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const solidButtonVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-[18px] text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary-hover text-primary-foreground shadow-[0_5px_0_var(--primary-deep)] hover:bg-primary-deep active:translate-y-[3px] active:shadow-[0_2px_0_var(--primary-deep)]",
        secondary:
          "bg-muted text-foreground shadow-[0_4px_0_var(--border)] hover:bg-muted-hover active:translate-y-[2px] active:shadow-[0_2px_0_var(--border)]",
        dark:
          "bg-foreground text-background shadow-[0_4px_0_rgba(17,24,39,0.22)] hover:bg-[#1F2937] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(17,24,39,0.22)]",
        ghost: "bg-transparent text-muted-foreground hover:bg-muted shadow-none",
        risk:
          "bg-risk-surface text-destructive shadow-[0_3px_0_rgba(146,64,14,0.16)] hover:bg-risk-surface-strong active:translate-y-[2px] active:shadow-[0_1px_0_rgba(146,64,14,0.16)]",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-5",
        icon: "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface SolidButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof solidButtonVariants> {
  asChild?: boolean
}

export function SolidButton({ className, variant, size, asChild = false, ...props }: SolidButtonProps) {
  const Comp = asChild ? Slot : "button"
  return <Comp className={cn(solidButtonVariants({ variant, size, className }))} {...props} />
}

