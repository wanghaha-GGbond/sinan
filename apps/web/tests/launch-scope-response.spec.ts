import { expect, test } from "@playwright/test"
import { NextRequest } from "next/server"

import { proxy } from "../src/proxy"
import { GET as researchList } from "../src/app/api/research/route"
import { GET as researchDetail } from "../src/app/api/research/[slug]/route"

test("research is private independently of launch scope, including direct handlers", async () => {
  const previous = process.env.LAUNCH_SCOPE_ONLY
  try {
    for (const value of ["true", "false"]) {
      process.env.LAUNCH_SCOPE_ONLY = value
      for (const path of ["/research", "/research/bytedance", "/api/research", "/api/research/bytedance"]) {
        const response = proxy(new NextRequest(`https://sinan.test${path}`))
        expect(response.status).toBe(404)
        expect(response.headers.get("cache-control")).toBe("private, no-store")
        expect(response.headers.get("x-content-type-options")).toBe("nosniff")
      }
    }
    // Handler checks also cover paths excluded by the proxy matcher (e.g. dots).
    const responses = [await researchList(), await researchDetail(new Request("https://sinan.test/api/research/private.json"), { params: Promise.resolve({ slug: "private.json" }) })]
    for (const response of responses) {
      expect(response.status).toBe(404)
      expect(response.headers.get("cache-control")).toBe("private, no-store")
      expect(await response.json()).toEqual({ error: "Not found" })
    }
  } finally {
    if (previous === undefined) delete process.env.LAUNCH_SCOPE_ONLY
    else process.env.LAUNCH_SCOPE_ONLY = previous
  }
})

test("enabled legacy Pulse links redirect into personal work records", () => {
  const previous = process.env.NEXT_PUBLIC_PULSE_ENABLED
  process.env.NEXT_PUBLIC_PULSE_ENABLED = "true"
  try {
    for (const path of ["/pulse", "/pulse/old?tab=week"]) {
      const response = proxy(new NextRequest(`https://sinan.test${path}`))
      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toBe("https://sinan.test/me#work-records")
      expect(response.headers.get("x-frame-options")).toBe("DENY")
    }
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_PULSE_ENABLED
    else process.env.NEXT_PUBLIC_PULSE_ENABLED = previous
  }
})

test("launch gate renders app HTML for deferred pages and JSON for APIs", async () => {
  const previous = process.env.LAUNCH_SCOPE_ONLY
  process.env.LAUNCH_SCOPE_ONLY = "true"

  try {
    const pageResponse = proxy(new NextRequest("https://sinan.test/auction"))
    expect(pageResponse.status).toBe(404)
    expect(pageResponse.headers.get("x-middleware-rewrite")).toContain(
      "/__sinan_launch_not_found__",
    )
    expect(pageResponse.headers.get("content-type")).toBeNull()

    const apiResponse = proxy(new NextRequest("https://sinan.test/api/auctions"))
    expect(apiResponse.status).toBe(404)
    expect(apiResponse.headers.get("content-type")).toContain("application/json")
    expect(await apiResponse.json()).toEqual({ error: "Not found" })
  } finally {
    if (previous === undefined) delete process.env.LAUNCH_SCOPE_ONLY
    else process.env.LAUNCH_SCOPE_ONLY = previous
  }
})
