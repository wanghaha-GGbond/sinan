"use client"

import { useState } from "react"
import { companyLogo } from "@/lib/company-logo"
import { cn } from "@/lib/utils"

/** Bundled, reviewed brand assets only: no visitor requests to third parties. */
export function CompanyLogo({ company, className }: { company: { id: string; name: string; shortName?: string | null }; className?: string }) {
  const source = companyLogo(company)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const showImage = source !== null && source !== failedSource
  return (
    <span data-testid="company-logo" className={cn("grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-border text-lg font-semibold sm:size-14", showImage ? "bg-white p-2" : "bg-primary-tint text-primary-deep", className)}>
      {showImage ? (
        // Original fixed-size static assets do not need the image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={source} alt={`${company.name} Logo`} width={48} height={48} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-contain" onError={() => setFailedSource(source)} />
      ) : <span aria-hidden="true">{Array.from(company.shortName || company.name)[0]}</span>}
    </span>
  )
}
