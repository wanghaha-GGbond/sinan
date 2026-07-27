import { expect, test } from "@playwright/test"

import { isDeferredLaunchPath } from "../src/lib/launch-scope"

test("launch gate hides deferred P2 pages and APIs", () => {
  for (const pathname of [
    "/auction",
    "/auction/abc/manage",
    "/circles/team",
    "/community",
    "/salaries",
    "/jobs",
    "/benefits",
    "/company/company-1/ratings",
    "/me/inbox/thread-1",
    "/me/requests-outgoing",
    "/api/auctions/abc/bids",
    "/api/circles/abc/join",
    "/api/dm/threads/abc/messages",
    "/api/leaderboard/auctions",
  ]) {
    expect(isDeferredLaunchPath(pathname), pathname).toBe(true)
  }
})

test("launch gate leaves every core Beta surface available", () => {
  for (const pathname of [
    "/",
    "/register",
    "/search",
    "/company/abc",
    "/submit/review",
    "/research/bytedance",
    "/moderation/reviews",
    "/settings/account",
    "/api/auth/register",
    "/api/companies/search",
    "/api/reviews",
    "/api/research",
    "/api/moderation/reviews",
  ]) {
    expect(isDeferredLaunchPath(pathname), pathname).toBe(false)
  }
})

test("launch gate uses path boundaries instead of partial string matches", () => {
  expect(isDeferredLaunchPath("/auctioneer")).toBe(false)
  expect(isDeferredLaunchPath("/api/dmsafe")).toBe(false)
})
