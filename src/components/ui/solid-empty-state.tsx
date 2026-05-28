import type { ReactNode } from "react"

import { SolidCard } from "@/components/ui/solid-card"
import { SolidButton } from "@/components/ui/solid-button"

export function SolidEmptyState({
  title = "这里还没有内容。",
  description = "等第一位过来人来指路。",
  ctaLabel,
  onCtaClick,
  action,
}: {
  title?: string
  description?: string
  ctaLabel?: string
  onCtaClick?: () => void
  action?: ReactNode
}) {
  return (
    <SolidCard variant="subtle" className="p-5 text-center">
      <h3 className="text-base font-semibold text-[#111827]">{title}</h3>
      <p className="mt-2 text-sm text-[#6B7280]">{description}</p>
      {ctaLabel ? (
        <div className="mt-4 flex justify-center">
          <SolidButton type="button" variant="secondary" onClick={onCtaClick}>
            {ctaLabel}
          </SolidButton>
        </div>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </SolidCard>
  )
}
