import { Activity } from "lucide-react"
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
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <Activity className="size-4" />
          Company Pulse
        </p>
        <p className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">功能体验版 · 周报与公司趋势为示例数据</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">把工作的时间和状态，看得见</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          每天回答两个问题，自动汇总工时、下班时间和恢复度。每周生成一张适合截图分享的工作周报。
        </p>
      </header>

      <CompanyPulseDashboard />
    </section>
  )
}
