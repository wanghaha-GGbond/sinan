import { notFound } from "next/navigation"

import { CompanyPulseDashboard } from "@/components/pulse/company-pulse-dashboard"
import { isPulseEnabled } from "@/lib/pulse-feature"

export const dynamic = "force-dynamic"

export default function CompanyPulsePage() {
  if (
    !isPulseEnabled({
      NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
      NEXT_PUBLIC_PULSE_ENABLED: process.env.NEXT_PUBLIC_PULSE_ENABLED,
    })
  ) {
    notFound()
  }

  return (
    <section className="mx-auto w-full max-w-page px-4 py-6 sm:px-6">
      <header className="mb-6 border-b border-border pb-6">
        <h1 className="text-3xl font-semibold text-foreground">Pulse</h1>
        <p className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">体验版 · 周报与公司趋势为示例数据</p>
      </header>

      <CompanyPulseDashboard />
    </section>
  )
}
