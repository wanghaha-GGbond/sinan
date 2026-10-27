import { expect, test } from "../database-fixture"
import { db } from "../../src/db/client"
import { verifyReadinessSchema } from "../../src/lib/server/readiness-schema"
import { GET } from "../../src/app/api/health/ready/route"

test("all current migrations satisfy the release schema readiness contract", async () => {
  await expect(verifyReadinessSchema((query) => db.execute(query))).resolves.toBeUndefined()
})

test("ready returns compatible release metadata only with valid config and migrated database", async () => {
  const fixture = {
    AUTH_SECRET: "readiness-test-only-secret-12345678901234567890", CRON_SECRET: "test-only",
    MAIL_FROM_DOMAIN: "example.invalid", ERROR_REPORTING_MODE: "stdout", APP_RELEASE: "a".repeat(40),
    NEXT_PUBLIC_APP_URL: "https://example.invalid", SUPPORT_EMAIL: "support@example.invalid",
    NEXT_PUBLIC_APP_ENV: "staging", NEXT_PUBLIC_PULSE_ENABLED: "true", MAIL_PROVIDER: "disabled",
    NEXT_PUBLIC_API_ENABLED: "true", LAUNCH_SCOPE_ONLY: "true", INVITE_REQUIRED: "true", DEPLOYMENT_REGION: "global",
  }
  const previous = Object.fromEntries(Object.keys(fixture).map((key) => [key, process.env[key]]))
  try {
    Object.assign(process.env, fixture)
    const ready = await GET()
    expect(ready.status).toBe(200)
    expect(ready.headers.get("cache-control")).toBe("no-store")
    expect(await ready.json()).toMatchObject({ status: "ready", schema: "compatible", release: fixture.APP_RELEASE, authContract: 2 })
    delete process.env.AUTH_SECRET
    const blocked = await GET()
    expect(blocked.status).toBe(503)
    expect(await blocked.json()).toMatchObject({ database: "not_checked", configuration: "invalid" })
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
