import { sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { readinessContract, verifyReadinessSchema } from "@/lib/server/readiness-schema"
import { mailConfigurationErrors } from "@/lib/server/mail-configuration.mjs"
import { registrationConfigurationErrors } from "@/lib/server/registration-configuration.mjs"

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
  return mailConfigurationErrors(process.env).length === 0
}

function hasValidErrorReportingConfiguration() {
  return process.env.ERROR_REPORTING_MODE === "stdout" || (
    process.env.ERROR_REPORTING_MODE === "webhook" &&
    Boolean(process.env.ERROR_REPORTING_WEBHOOK?.trim())
  )
}

function hasValidRuntimeConfiguration() {
  const appEnvironment = process.env.NEXT_PUBLIC_APP_ENV
  const pulseReady =
    appEnvironment === "production"
      ? process.env.NEXT_PUBLIC_PULSE_ENABLED === "false"
      : process.env.NEXT_PUBLIC_PULSE_ENABLED === "true"
  const region = process.env.DEPLOYMENT_REGION ?? "mainland"
  const filingReady =
    appEnvironment === "production" && region === "mainland"
      ? Boolean(process.env.NEXT_PUBLIC_ICP_FILING_NUMBER?.trim())
      : true

  return (
    requiredRuntimeVariables.every((name) => Boolean(process.env[name]?.trim())) &&
    (process.env.AUTH_SECRET?.trim().length ?? 0) >= 32 &&
    registrationConfigurationErrors(process.env).length === 0 &&
    process.env.NEXT_PUBLIC_API_ENABLED === "true" &&
    process.env.LAUNCH_SCOPE_ONLY === "true" &&
    (process.env.DATABASE_ADAPTER === "pg" || process.env.DATABASE_ADAPTER === "neon") &&
    hasValidMailConfiguration() &&
    hasValidErrorReportingConfiguration() &&
    pulseReady &&
    (region === "global" || region === "mainland") &&
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
    try {
      await verifyReadinessSchema((query) => db.execute(query))
    } catch {
      return NextResponse.json(
        { status: "not_ready", configuration: "valid", database: "reachable", schema: "incompatible" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      )
    }
    return NextResponse.json(
      { status: "ready", configuration: "valid", database: "reachable", schema: "compatible", release: process.env.APP_RELEASE, ...readinessContract },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch {
    return NextResponse.json(
      { status: "not_ready", configuration: "valid", database: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    )
  }
}
