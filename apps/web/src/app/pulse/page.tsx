import { notFound } from "next/navigation"

import { PersonalPulseDashboard } from "@/components/pulse/personal-pulse-dashboard"
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
    <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-6 border-b border-border pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">打卡与周报</h1>
      </header>

      <PersonalPulseDashboard />
    </section>
  )
}
