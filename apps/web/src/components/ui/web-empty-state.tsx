import type { ReactNode } from "react"

import { WebButton } from "@/components/ui/web-button"
import { WebSurface } from "@/components/ui/web-surface"

export function WebEmptyState({
  title = "暂无内容",
  description,
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
  const content = (
    <div className="space-y-2 text-center">
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
      {action ?? (ctaLabel && onCtaClick ? (
        <WebButton type="button" variant="secondary" className="mt-3" onClick={onCtaClick}>
          {ctaLabel}
        </WebButton>
      ) : null)}
    </div>
  )

  if (!framed) return content
  return <WebSurface tone="base" className="p-6">{content}</WebSurface>
}
