import { expect, test } from "@playwright/test"
import { NextRequest } from "next/server"

import { proxy } from "../src/proxy"

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
