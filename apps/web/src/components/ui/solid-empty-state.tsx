import type { ReactNode } from "react"

import { SolidButton } from "@/components/ui/solid-button"

export function SolidEmptyState({
  title = "这里还没有内容。",
  description = "等第一位过来人来指路。",
  ctaLabel,
  onCtaClick,
  action,
  framed = false,
}: {
  title?: string
  description?: string
  ctaLabel?: string
  onCtaClick?: () => void
  action?: ReactNode
  framed?: boolean
}) {
  return (
    <div className={framed ? "rounded-2xl border border-border/60 bg-card p-5 text-center" : "py-8 text-center"}>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {ctaLabel ? (
        <div className="mt-4 flex justify-center">
          <SolidButton type="button" variant="secondary" onClick={onCtaClick}>
            {ctaLabel}
          </SolidButton>
        </div>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
