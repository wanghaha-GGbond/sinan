import { expect, test } from "@playwright/test"

import { createServerErrorEvent } from "../src/lib/server/error-reporting"

test("server error events exclude query strings and request secrets", () => {
  const event = createServerErrorEvent({
    error: Object.assign(new Error("database unavailable"), { digest: "abc123" }),
    request: { method: "POST", path: "/api/reviews?token=secret&email=user@example.com" },
    context: { routePath: "/api/reviews/route", routeType: "route" },
    now: new Date("2026-07-04T00:00:00.000Z"),
  })

  expect(event).toMatchObject({
    service: "sinan-web",
    occurredAt: "2026-07-04T00:00:00.000Z",
    message: "database unavailable",
    digest: "abc123",
    method: "POST",
    path: "/api/reviews",
    routePath: "/api/reviews/route",
    routeType: "route",
  })
  expect(JSON.stringify(event)).not.toContain("secret")
  expect(JSON.stringify(event)).not.toContain("user@example.com")
})
