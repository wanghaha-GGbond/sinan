import { expect, test } from "@playwright/test"
import { NextRequest } from "next/server"

import { GET as searchCompanies } from "../src/app/api/companies/search/route"
import { proxy } from "../src/proxy"

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
