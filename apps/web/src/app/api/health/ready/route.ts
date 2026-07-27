import { sql } from "drizzle-orm"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const requiredRuntimeVariables = [
  "AUTH_SECRET",
  "DATABASE_URL",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "MAIL_FROM_DOMAIN",
  "ERROR_REPORTING_WEBHOOK",
  "APP_RELEASE",
  "NEXT_PUBLIC_APP_URL",
  "SUPPORT_EMAIL",
] as const

function hasValidRuntimeConfiguration() {
  return (
    requiredRuntimeVariables.every((name) => Boolean(process.env[name]?.trim())) &&
    process.env.INVITE_REQUIRED === "true" &&
    process.env.NEXT_PUBLIC_API_ENABLED === "true" &&
    process.env.LAUNCH_SCOPE_ONLY === "true" &&
    process.env.MAIL_PROVIDER === "resend" &&
    (process.env.NEXT_PUBLIC_APP_ENV === "staging" ||
      process.env.NEXT_PUBLIC_APP_ENV === "production")
  )
}

export async function GET() {
  if (!hasValidRuntimeConfiguration()) {
    return NextResponse.json(
      { status: "not_ready", configuration: "invalid", database: "not_checked" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    )
  }

  try {
    const { db } = await import("@/db/client")
    await db.execute(sql`select 1`)
    return NextResponse.json(
      { status: "ready", configuration: "valid", database: "reachable" },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch {
    return NextResponse.json(
      { status: "not_ready", configuration: "valid", database: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    )
  }
}
