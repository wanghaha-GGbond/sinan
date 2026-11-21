import { notFound, redirect } from "next/navigation"
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

  redirect("/me#work-records")
}
