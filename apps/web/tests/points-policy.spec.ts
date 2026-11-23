import { randomUUID } from "node:crypto"
import { NextRequest } from "next/server"
import { expect, test } from "@playwright/test"
import { pointTaskInput, pointBidInput, pointGrantInput, pointTaskKey, pointsPolicy } from "../src/lib/points"
import { dialogueDraftInput } from "../src/lib/dialogue"
import { pointsServerEnabled } from "../src/lib/server/points-feature"
import { GET as wallet } from "../src/app/api/me/points/route"
import { POST as claim } from "../src/app/api/me/points/claim/route"
import { POST as grant } from "../src/app/api/moderation/points/grant/route"
import { POST as bid } from "../src/app/api/dialogues/[id]/points-bids/route"
import { proxy } from "../src/proxy"

test("points are earned-only, not money, transfers or donations", () => {
  expect(pointsPolicy).toEqual({ purchasable: false, transferable: false, redeemableForCash: false, donation: false })
  const input = { requestId: randomUUID(), points: 10, question: "希望了解真实工作中的协作与成长。" }
  expect(pointBidInput.safeParse(input).success).toBe(true)
  for (const points of [-1, 0, 1.5, 1000001, Infinity, "10"]) expect(pointBidInput.safeParse({ ...input, points }).success).toBe(false)
  for (const extra of [{ userId: randomUUID() }, { amountCents: 100 }, { currency: "CNY" }, { status: "selected" }, { recipient: "someone" }]) expect(pointBidInput.safeParse({ ...input, ...extra }).success).toBe(false)
  for (const data of [{ task: "daily_visit", points: 999 }, { task: "daily_visit", day: "tomorrow" }, { task: "write_positive_review" }]) expect(pointTaskInput.safeParse(data).success).toBe(false)
  expect(pointGrantInput.safeParse({ campaignId: randomUUID(), email: "user@example.test", points: 1001, reason: "参与活动奖励" }).success).toBe(false)
})
test("daily rewards use Shanghai server time and welcome rewards are once per account", () => {
  expect(pointTaskKey("daily_visit", new Date("2026-11-23T15:59:59Z"))).toBe("task:daily_visit:2026-11-23")
  expect(pointTaskKey("daily_visit", new Date("2026-11-23T16:00:00Z"))).toBe("task:daily_visit:2026-11-24")
  expect(pointTaskKey("verified_email", new Date("2030-01-01"))).toBe(pointTaskKey("verified_email", new Date("2020-01-01")))
})
test("points auctions require one place and cannot promise monetary proceeds", () => {
  const data = { requestId: randomUUID(), title: "隔离积分对话", description: "一次用于隔离测试的工作经历与团队协作对话。", guestName: "测试嘉宾", guestBio: "仅用于验证输入规则的测试嘉宾。", durationMinutes: 45, capacity: 1, startsAt: "2030-01-02T00:00:00Z", signupEndsAt: "2030-01-01T00:00:00Z", guestConsentConfirmed: true, selectionMode: "points" }
  expect(dialogueDraftInput.safeParse(data).success).toBe(true)
  expect(dialogueDraftInput.safeParse({ ...data, capacity: 2 }).success).toBe(false)
  expect(dialogueDraftInput.safeParse({ ...data, fundingMode: "all_donated" }).success).toBe(false)
})
test("points routes fail closed unless dialogue and independent points flags are enabled", async () => {
  const keys = ["NEXT_PUBLIC_DIALOGUE_ENABLED", "DIALOGUE_ENABLED", "NEXT_PUBLIC_POINTS_ENABLED", "POINTS_ENABLED"] as const, previous = keys.map(key => process.env[key])
  try {
    keys.forEach(key => { process.env[key] = "true" }); expect(pointsServerEnabled()).toBe(true)
    for (const disabled of keys) {
      process.env[disabled] = "false"; expect(pointsServerEnabled()).toBe(false)
      const request = new NextRequest("https://zaichang.test/api/me/points")
      expect((await wallet(request)).status).toBe(404)
      expect((await claim(new NextRequest(request.url, { method: "POST", body: "{}" }))).status).toBe(404)
      for (const path of ["/me/points", "/api/me/points/claim", "/api/moderation/points/grant"]) expect(proxy(new NextRequest("https://zaichang.test" + path)).status).toBe(404)
      process.env[disabled] = "true"
    }
    const request = new NextRequest("https://zaichang.test/api/me/points", { headers: { Authorization: "Bearer invalid-fixture" } })
    expect((await wallet(request)).status).toBe(401)
    expect((await grant(new NextRequest(request.url, { method: "POST", headers: request.headers, body: "{}" }))).status).toBe(401)
    expect((await bid(new NextRequest(request.url, { method: "POST", headers: { Origin: "https://evil.test" }, body: "{}" }), { params: Promise.resolve({ id: randomUUID() }) })).status).toBe(403)
  } finally { keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i] }) }
})
