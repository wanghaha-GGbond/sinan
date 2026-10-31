import type { ReactNode } from "react"

import { WebButton } from "@/components/ui/web-button"
import { WebSurface } from "@/components/ui/web-surface"

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
  const content = (
    <>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {ctaLabel ? (
        <div className="mt-4 flex justify-center">
          <WebButton type="button" variant="secondary" onClick={onCtaClick}>
            {ctaLabel}
          </WebButton>
        </div>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </>
  )

  return framed ? (
    <WebSurface tone="base" className="p-5 text-center">{content}</WebSurface>
  ) : (
    <div className="py-8 text-center">{content}</div>
  )
}
