import { expect, test } from "@playwright/test"
import { NextRequest } from "next/server"
import { spawnSync } from "node:child_process"
import path from "node:path"

import { GET as searchCompanies } from "../src/app/api/companies/search/route"
import { proxy } from "../src/proxy"

function checkRelease(overrides: Record<string, string>) {
  return spawnSync(process.execPath, [path.join(process.cwd(), "scripts/check-release-env.mjs")], {
    encoding: "utf8",
    env: {
      NODE_ENV: "test",
      AUTH_SECRET: "test-only-not-a-secret".repeat(3),
      DATABASE_URL: "postgresql://test:test@example.invalid/test",
      CRON_SECRET: "test-only-not-a-secret",
      MAIL_FROM_DOMAIN: "example.invalid",
      MAIL_PROVIDER: "resend",
      RESEND_API_KEY: "test-only-not-a-secret",
      APP_RELEASE: "test-release",
      NEXT_PUBLIC_APP_URL: "https://example.invalid",
      SUPPORT_EMAIL: "support@example.invalid",
      INVITE_REQUIRED: "true",
      DATABASE_ADAPTER: "neon",
      ERROR_REPORTING_MODE: "stdout",
      NEXT_PUBLIC_APP_ENV: "production",
      NEXT_PUBLIC_API_ENABLED: "true",
      NEXT_PUBLIC_PULSE_ENABLED: "false",
      LAUNCH_SCOPE_ONLY: "true",
      ...overrides,
    },
  })
}

test("global production accepts Neon without mainland filing but retains required services", () => {
  expect(checkRelease({ DEPLOYMENT_REGION: "global" }).status).toBe(0)
  expect(checkRelease({ DEPLOYMENT_REGION: "global", DATABASE_URL: "" }).status).toBe(1)
  expect(checkRelease({ DEPLOYMENT_REGION: "global", MAIL_PROVIDER: "disabled" }).status).toBe(1)
})

test("mainland defaults retain filing and pg requirements; invalid regions fail closed", () => {
  const mainland = checkRelease({})
  expect(mainland.status).toBe(1)
  expect(mainland.stderr).toContain("NEXT_PUBLIC_ICP_FILING_NUMBER")
  expect(mainland.stderr).toContain("DATABASE_ADAPTER must be pg")
  expect(checkRelease({ DEPLOYMENT_REGION: "unknown" }).status).toBe(1)
})

test("production company search fails closed when the database is missing", async () => {
  const previousEnvironment = process.env.NEXT_PUBLIC_APP_ENV
  const previousDatabaseURL = process.env.DATABASE_URL
  process.env.NEXT_PUBLIC_APP_ENV = "production"
  delete process.env.DATABASE_URL

  try {
    const response = await searchCompanies(
      new NextRequest("https://sinan.test/api/companies/search?q=腾讯"),
    )
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: "Service unavailable" })
  } finally {
    if (previousEnvironment === undefined) delete process.env.NEXT_PUBLIC_APP_ENV
    else process.env.NEXT_PUBLIC_APP_ENV = previousEnvironment
    if (previousDatabaseURL === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = previousDatabaseURL
  }
})

test("production Pulse is not publicly routable when the flag is off", () => {
  const previousEnvironment = process.env.NEXT_PUBLIC_APP_ENV
  const previousPulseFlag = process.env.NEXT_PUBLIC_PULSE_ENABLED
  process.env.NEXT_PUBLIC_APP_ENV = "production"
  process.env.NEXT_PUBLIC_PULSE_ENABLED = "false"

  try {
    const response = proxy(new NextRequest("https://sinan.test/pulse"))
    expect(response.status).toBe(404)
    expect(response.headers.get("x-middleware-rewrite")).toContain(
      "/__sinan_launch_not_found__",
    )
  } finally {
    if (previousEnvironment === undefined) delete process.env.NEXT_PUBLIC_APP_ENV
    else process.env.NEXT_PUBLIC_APP_ENV = previousEnvironment
    if (previousPulseFlag === undefined) delete process.env.NEXT_PUBLIC_PULSE_ENABLED
    else process.env.NEXT_PUBLIC_PULSE_ENABLED = previousPulseFlag
  }
})

test("API-enabled client data never converts a network failure into mock success", async () => {
  const previousApiFlag = process.env.NEXT_PUBLIC_API_ENABLED
  const previousFetch = globalThis.fetch
  process.env.NEXT_PUBLIC_API_ENABLED = "true"
  globalThis.fetch = async () => {
    throw new Error("offline")
  }

  try {
    const { searchCompaniesData, submitCompanyCommunitySubmission } = await import(
      "../src/lib/data/companies"
    )
    const { getReviewDiscussionsData, submitReviewDiscussionData } = await import(
      "../src/lib/data/discussions"
    )

    expect(await searchCompaniesData("腾讯")).toEqual([])
    expect(
      await submitCompanyCommunitySubmission({
        registeredName: "网络失败测试公司",
        unifiedSocialCreditCode: "91310000NETWORKFAIL000",
        registeredAddress: "上海",
        legalRepresentative: "测试代表",
        city: "上海",
        industry: "软件服务",
      }),
    ).toMatchObject({ ok: false })
    expect(await getReviewDiscussionsData("review-id")).toEqual({
      publicDiscussions: [],
      myDiscussions: [],
      nextCursor: null,
    })
    expect(
      await submitReviewDiscussionData("review-id", {
        companyId: "company-id",
        type: "question",
        content: "网络失败时不能本地伪造成功。",
      }),
    ).toMatchObject({ ok: false })
  } finally {
    globalThis.fetch = previousFetch
    if (previousApiFlag === undefined) delete process.env.NEXT_PUBLIC_API_ENABLED
    else process.env.NEXT_PUBLIC_API_ENABLED = previousApiFlag
  }
})
