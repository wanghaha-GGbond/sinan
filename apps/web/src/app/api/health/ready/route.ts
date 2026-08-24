import { sql } from "drizzle-orm"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const requiredRuntimeVariables = [
  "AUTH_SECRET",
  "DATABASE_URL",
  "CRON_SECRET",
  "DATABASE_ADAPTER",
  "MAIL_FROM_DOMAIN",
  "ERROR_REPORTING_MODE",
  "APP_RELEASE",
  "NEXT_PUBLIC_APP_URL",
  "SUPPORT_EMAIL",
] as const

function hasValidMailConfiguration() {
  if (
    process.env.NEXT_PUBLIC_APP_ENV === "staging" &&
    process.env.MAIL_PROVIDER === "disabled"
  ) {
    return true
  }
  if (process.env.MAIL_PROVIDER === "aliyun-direct-mail") {
    return Boolean(
      process.env.ALIYUN_DM_ACCOUNT_NAME?.trim() &&
      process.env.ALIYUN_DM_REGION?.trim()
    )
  }
  return process.env.MAIL_PROVIDER === "resend" && Boolean(process.env.RESEND_API_KEY?.trim())
}

function hasValidErrorReportingConfiguration() {
  return process.env.ERROR_REPORTING_MODE === "stdout" || (
    process.env.ERROR_REPORTING_MODE === "webhook" &&
    Boolean(process.env.ERROR_REPORTING_WEBHOOK?.trim())
  )
}

function hasValidRuntimeConfiguration() {
  const appEnvironment = process.env.NEXT_PUBLIC_APP_ENV
  const filingReady =
    appEnvironment === "production"
      ? Boolean(process.env.NEXT_PUBLIC_ICP_FILING_NUMBER?.trim())
      : true

  return (
    requiredRuntimeVariables.every((name) => Boolean(process.env[name]?.trim())) &&
    process.env.INVITE_REQUIRED === "true" &&
    process.env.NEXT_PUBLIC_API_ENABLED === "true" &&
    process.env.LAUNCH_SCOPE_ONLY === "true" &&
    (process.env.DATABASE_ADAPTER === "pg" || process.env.DATABASE_ADAPTER === "neon") &&
    hasValidMailConfiguration() &&
    hasValidErrorReportingConfiguration() &&
    (appEnvironment === "staging" || appEnvironment === "production") &&
    filingReady
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
