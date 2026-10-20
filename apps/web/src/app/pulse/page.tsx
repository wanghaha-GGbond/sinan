import { Activity } from "lucide-react"

import { CompanyPulseDashboard } from "@/components/pulse/company-pulse-dashboard"

export default function CompanyPulsePage() {
  return (
    <section className="mx-auto w-full max-w-page px-4 py-6 sm:px-6">
      <header className="mb-6 border-b border-border pb-6">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <Activity className="size-4" />
          Company Pulse
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">把工作的时间和状态，看得见</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          每天回答两个问题，自动汇总工时、下班时间和恢复度。每周生成一张适合截图分享的工作周报。
        </p>
      </header>

      <CompanyPulseDashboard />
    </section>
  )
}
