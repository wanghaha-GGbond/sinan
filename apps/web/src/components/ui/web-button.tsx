import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Web-only action control. The native apps keep their Solid components;
 * this primitive deliberately uses a quiet, flat hierarchy for browsers.
 */
export const webButtonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border text-sm font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "border-primary bg-primary text-primary-foreground hover:bg-primary-hover hover:border-primary-hover",
        secondary: "border-input bg-card text-foreground hover:bg-muted-hover",
        quiet: "border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        danger: "border-risk-border bg-risk-surface text-destructive hover:bg-risk-surface-strong",
        // Compatibility aliases for pages still being migrated. They all
        // resolve to the flat Web hierarchy; none recreate the old Solid UI.
        dark: "border-foreground bg-foreground text-background hover:bg-foreground/90",
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
  },
)

export interface WebButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof webButtonVariants> {
  asChild?: boolean
}

export function WebButton({ className, variant, size, asChild = false, ...props }: WebButtonProps) {
  const Comp = asChild ? Slot : "button"
  return <Comp className={cn(webButtonVariants({ variant, size, className }))} {...props} />
}
