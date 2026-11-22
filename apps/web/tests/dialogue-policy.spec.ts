import { expect, test } from "@playwright/test"
import { NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { dialogueEnabled, dialogueMoneyPolicy, dialogueDraftInput, dialogueApplicationInput, dialogueActionInput, dialogueDecisionInput, dialogueCursor, parseDialogueCursor } from "../src/lib/dialogue"
import { GET as list } from "../src/app/api/dialogues/route"
import { POST as apply } from "../src/app/api/dialogues/[id]/applications/route"
import { GET as mine } from "../src/app/api/me/dialogues/route"
import { GET as management, POST as create } from "../src/app/api/moderation/dialogues/route"
import { isDeferredLaunchPath } from "../src/lib/launch-scope"

test("dialogue is explicit opt-in and never enables legacy bidding or money", () => {
  for (const value of [undefined, "false", "1", "TRUE", ""]) expect(dialogueEnabled({ NEXT_PUBLIC_DIALOGUE_ENABLED: value })).toBe(false)
  expect(dialogueEnabled({ NEXT_PUBLIC_DIALOGUE_ENABLED: "true" })).toBe(true)
  expect(dialogueMoneyPolicy).toEqual({ paymentsEnabled: false, biddingEnabled: false, donationStatus: "not_started" })
  for (const path of ["/auction", "/api/auctions", "/api/auctions/a/bids"]) expect(isDeferredLaunchPath(path)).toBe(true)
})
test("activity inputs reject payment, donation proof, caller identity and extra financial fields", () => {
  const draft = { requestId: randomUUID(), title: "行业经历对话", description: "与受邀嘉宾聊聊真实的工作经历和跨团队协作。", guestName: "测试嘉宾", guestBio: "拥有一线团队管理与协作经验。", durationMinutes: 45, capacity: 1, startsAt: "2030-01-02T04:00:00Z", signupEndsAt: "2030-01-01T04:00:00Z", guestConsentConfirmed: false }
  expect(dialogueDraftInput.parse(draft)).toMatchObject({ companyId: null, fundingMode: "undecided" })
  for (const extra of [{ amount: 100 }, { amountCents: 100 }, { paymentsEnabled: true }, { donationStatus: "donated" }, { receiptUrl: "https://example.test/receipt" }, { status: "open" }, { createdBy: randomUUID() }]) expect(dialogueDraftInput.safeParse({ ...draft, ...extra }).success).toBe(false)
  expect(dialogueDraftInput.safeParse({ ...draft, signupEndsAt: "2030-01-03T00:00:00Z" }).success).toBe(false)
  expect(dialogueDraftInput.safeParse({ ...draft, capacity: 0 }).success).toBe(false)
  for (const extra of [{ amount: 100 }, { userId: randomUUID() }, { status: "selected" }, { paymentMethod: "bank" }]) expect(dialogueApplicationInput.safeParse({ question: "想了解团队如何安排日常协作？", requestId: randomUUID(), ...extra }).success).toBe(false)
})
test("completion requires recap permission and no action can settle money", () => {
  expect(dialogueActionInput.safeParse({ action: "complete", recap: "未经授权的纪要", recapConsentConfirmed: false }).success).toBe(false)
  expect(dialogueActionInput.safeParse({ action: "complete", recap: "", recapConsentConfirmed: false }).success).toBe(true)
  for (const action of ["pay", "bid", "settle", "donate", "refund"]) expect(dialogueActionInput.safeParse({ action }).success).toBe(false)
  expect(dialogueDecisionInput.safeParse({ status: "selected", expectedStatus: "withdrawn", reason: "名额安排" }).success).toBe(false)
})
test("cursor is bounded and cannot cross public, personal, company or management scopes", () => {
  const id = randomUUID(), date = new Date("2026-11-22T00:00:00Z"), cursor = dialogueCursor("public:all", { id, createdAt: date })
  expect(parseDialogueCursor("public:all", cursor)).toEqual({ id, date })
  for (const scope of ["admin", "mine:a", "queue:b", "public:company"]) expect(() => parseDialogueCursor(scope, cursor)).toThrow("分页链接")
  for (const value of ["!", "a".repeat(601), btoa('{}'), dialogueCursor("public:all", { id: "invalid", createdAt: date })]) expect(() => parseDialogueCursor("public:all", value)).toThrow()
})
test("disabled dialogue endpoints fail closed before auth or database access", async () => {
  const before = process.env.NEXT_PUBLIC_DIALOGUE_ENABLED
  process.env.NEXT_PUBLIC_DIALOGUE_ENABLED = "false"
  try {
    const request = new NextRequest("https://zaichang.test/api/dialogues")
    const responses = [await list(request), await mine(request), await management(request), await create(new NextRequest(request.url, { method: "POST", body: "{}" })), await apply(new NextRequest(request.url, { method: "POST", body: "{}" }), { params: Promise.resolve({ id: randomUUID() }) })]
    for (const response of responses) { expect(response.status).toBe(404); expect(response.headers.get("cache-control")).toContain("no-store"); expect(await response.json()).toEqual({ error: "Not found" }) }
  } finally { if (before === undefined) delete process.env.NEXT_PUBLIC_DIALOGUE_ENABLED; else process.env.NEXT_PUBLIC_DIALOGUE_ENABLED = before }
})
test("enabled APIs reject anonymous and foreign-origin writes and never fabricate activities without DB", async () => {
  const previous = { enabled: process.env.NEXT_PUBLIC_DIALOGUE_ENABLED, database: process.env.DATABASE_URL }
  process.env.NEXT_PUBLIC_DIALOGUE_ENABLED = "true"; process.env.DATABASE_URL = ""
  try {
    const base = "https://zaichang.test/api/dialogues", headers = { Authorization: "Bearer invalid-fixture-token" }
    const unavailable = await list(new NextRequest(base))
    expect(unavailable.status).toBe(503); expect(await unavailable.json()).toEqual({ error: "对话活动暂时不可用，请稍后重试" })
    expect((await list(new NextRequest(base + "?companyId=invalid"))).status).toBe(400)
    for (const read of [mine, management]) expect((await read(new NextRequest(base, { headers }))).status).toBe(401)
    expect((await create(new NextRequest(base, { method: "POST", headers, body: "{}" }))).status).toBe(401)
    expect((await apply(new NextRequest(base, { method: "POST", headers: { ...headers, Origin: "https://evil.test" }, body: "{}" }), { params: Promise.resolve({ id: randomUUID() }) })).status).toBe(403)
  } finally {
    if (previous.enabled === undefined) delete process.env.NEXT_PUBLIC_DIALOGUE_ENABLED; else process.env.NEXT_PUBLIC_DIALOGUE_ENABLED = previous.enabled
    if (previous.database === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous.database
  }
})
