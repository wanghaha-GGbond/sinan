import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Deprecated Web compatibility wrapper. New browser surfaces should import
// WebButton directly; the native apps keep their own SolidButton primitives.
const solidButtonVariants = cva(
"inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "border-primary bg-primary text-primary-foreground hover:bg-primary-hover hover:border-primary-hover",
        secondary: "border-input bg-card text-foreground hover:bg-muted-hover",
        dark: "border-foreground bg-foreground text-background hover:bg-[var(--tw-slate-700)]",
        ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        risk: "border-risk-border bg-risk-surface text-destructive hover:bg-risk-surface-strong",
      },
      size: {
        sm: "h-11 px-3 text-sm",
        md: "h-11 px-4",
        lg: "h-11 px-5",
        icon: "size-11 rounded-full px-0",
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
