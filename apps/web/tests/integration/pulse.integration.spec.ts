import { randomUUID } from "node:crypto"
import { inArray } from "drizzle-orm"
import { NextRequest } from "next/server"
import { expect, test } from "../database-fixture"
import { db } from "../../src/db/client"
import { users } from "../../src/db/schema/users"
import { signToken } from "../../src/lib/server/auth"
import { GET, POST } from "../../src/app/api/me/pulse/route"

const ids: string[] = []
const originalFlag = process.env.NEXT_PUBLIC_PULSE_ENABLED
test.beforeEach(() => { process.env.NEXT_PUBLIC_PULSE_ENABLED = "true" })
test.afterEach(async () => {
  if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_PULSE_ENABLED
  else process.env.NEXT_PUBLIC_PULSE_ENABLED = originalFlag
  if (ids.length) await db.delete(users).where(inArray(users.id, ids.splice(0)))
})
async function account() {
  const [user] = await db.insert(users).values({ email: `pulse-${randomUUID()}@integration.sinan.test` }).returning()
  ids.push(user.id)
  return signToken({ userId: user.id, role: "user" })
}
function request(token: string, body?: unknown) {
  return new NextRequest("https://app.example/api/me/pulse", {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}
test("daily upsert is unique, private, and read after a new request", async () => {
  const a = await account(), b = await account()
  const results = await Promise.all([1, 4, 7].map(energy => POST(request(a, { energy, pressure: 3 }))))
  expect(results.map(r => r.status)).toEqual([200, 200, 200])
  const response = await GET(request(a))
  expect(response.headers.get("cache-control")).toBe("private, no-store")
  const body = await response.json()
  expect(body.records).toHaveLength(1)
  expect(body.records[0]).not.toHaveProperty("userId")
  expect((await (await GET(request(b))).json()).records).toEqual([])
  expect((await POST(request(a, { energy: 2, pressure: 2, userId: ids[1] }))).status).toBe(400)
  expect((await POST(request(a, { energy: 2, pressure: 2, day: "2000-01-01" }))).status).toBe(400)
})
test("disabled and unauthenticated endpoints fail closed", async () => {
  expect((await GET(request("invalid-token"))).status).toBe(401)
  expect((await POST(request("invalid-token", { energy: 2, pressure: 2 }))).status).toBe(401)
  process.env.NEXT_PUBLIC_PULSE_ENABLED = "false"
  expect((await GET(request("invalid-token"))).status).toBe(404)
  expect((await POST(request("invalid-token", { energy: 2, pressure: 2 }))).status).toBe(404)
})
