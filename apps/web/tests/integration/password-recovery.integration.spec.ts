import { createHash, randomUUID } from "node:crypto"
import { expect, test } from "../database-fixture"
import { eq, inArray, sql } from "drizzle-orm"
import { NextRequest } from "next/server"
import { db } from "../../src/db/client"
import { users } from "../../src/db/schema/users"
import { passwordResetTokens } from "../../src/db/schema/password-reset-tokens"
import { hashPassword, verifyPassword, signToken, getAuthUserFromRequest } from "../../src/lib/server/auth"
import { consumePasswordReset, issuePasswordReset } from "../../src/lib/server/password-recovery"
import { createPasswordResetToken, hashPasswordResetToken } from "../../src/lib/server/password-recovery-policy"
import { checkPersistentRateLimit } from "../../src/lib/server/persistent-rate-limit"
import { securityRateLimits } from "../../src/db/schema/security-rate-limits"

const ids: string[] = []
const originalFetch = globalThis.fetch
const originalEnv = { ...process.env }

async function fixture() {
  const [user] = await db.insert(users).values({ email: `recovery-${randomUUID()}@integration.sinan.test`,
    passwordHash: await hashPassword("BeforeReset123!") }).returning()
  ids.push(user.id)
  const token = createPasswordResetToken()
  await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash: hashPasswordResetToken(token),
    sessionVersion: 0, expiresAt: sql`clock_timestamp() + interval '1 minute'` })
  return { user, token }
}

test.afterEach(async () => {
  globalThis.fetch = originalFetch
  for (const key of ["MAIL_PROVIDER", "MAIL_FROM_DOMAIN", "RESEND_API_KEY", "NEXT_PUBLIC_APP_URL"]) {
    if (originalEnv[key] === undefined) delete process.env[key]
    else process.env[key] = originalEnv[key]
  }
  if (ids.length) await db.delete(users).where(inArray(users.id, ids.splice(0)))
})

test("a reset link can be consumed only once across concurrent requests", async () => {
  const { user, token } = await fixture()
  const oldJwt = await signToken({ userId: user.id, role: "user" })
  const attempts = await Promise.all([consumePasswordReset(token, "AfterReset123!"), consumePasswordReset(token, "OtherPassword123!")])
  expect(attempts.filter(Boolean)).toHaveLength(1)
  const [stored] = await db.select().from(users).where(eq(users.id, user.id))
  expect(stored.sessionVersion).toBe(1)
  expect(await verifyPassword("BeforeReset123!", stored.passwordHash!)).toBe(false)
  expect(await verifyPassword(attempts[0] ? "AfterReset123!" : "OtherPassword123!", stored.passwordHash!)).toBe(true)
  expect(await consumePasswordReset(token, "ThirdPassword123!")).toBeNull()
  expect(await getAuthUserFromRequest(new NextRequest("https://app.example/api/auth/me", {
    headers: { authorization: `Bearer ${oldJwt}` },
  }))).toBeNull()
  const freshJwt = await signToken({ userId: user.id, role: "user", sessionVersion: 1 })
  expect((await getAuthUserFromRequest(new NextRequest("https://app.example/api/auth/me", {
    headers: { authorization: `Bearer ${freshJwt}` },
  })))?.userId).toBe(user.id)
})

test("expired, superseded, unknown and deleted-account tokens cannot change passwords", async () => {
  const { user, token } = await fixture()
  expect(await consumePasswordReset(createPasswordResetToken(), "AfterReset123!")).toBeNull()
  await db.update(passwordResetTokens).set({ expiresAt: sql`clock_timestamp() - interval '1 second'` }).where(eq(passwordResetTokens.userId, user.id))
  expect(await consumePasswordReset(token, "AfterReset123!")).toBeNull()
  await db.update(passwordResetTokens).set({ expiresAt: sql`clock_timestamp() + interval '1 minute'`, sessionVersion: 1 }).where(eq(passwordResetTokens.userId, user.id))
  expect(await consumePasswordReset(token, "AfterReset123!")).toBeNull()
  await db.update(passwordResetTokens).set({ sessionVersion: 0 }).where(eq(passwordResetTokens.userId, user.id))
  await db.update(users).set({ status: "deleted", deletedAt: new Date() }).where(eq(users.id, user.id))
  expect(await consumePasswordReset(token, "AfterReset123!")).toBeNull()
})

test("issuance stores only a hash, replaces old links, and never mails unknown accounts", async () => {
  const { user, token: oldToken } = await fixture()
  process.env.MAIL_PROVIDER = "resend"
  process.env.MAIL_FROM_DOMAIN = "example.test"
  process.env.RESEND_API_KEY = "integration-test-only"
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example"
  const bodies: string[] = []
  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.resend.com/emails") {
      bodies.push(String(init?.body)); return new Response("{}", { status: 200 })
    }
    return originalFetch(input, init)
  }
  await issuePasswordReset(user.email!)
  expect(bodies).toHaveLength(1)
  const token = JSON.parse(bodies[0]).text.match(/#token=([a-f0-9]{64})/)[1] as string
  const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id))
  expect(row.tokenHash).toBe(hashPasswordResetToken(token))
  expect(row.tokenHash).not.toBe(token)
  expect(await consumePasswordReset(oldToken, "AfterReset123!")).toBeNull()
  await issuePasswordReset(`missing-${randomUUID()}@integration.sinan.test`)
  expect(bodies).toHaveLength(1)
  expect(await consumePasswordReset(token, "AfterReset123!")).not.toBeNull()
})

test("failed delivery removes its unusable link", async () => {
  const { user } = await fixture()
  process.env.MAIL_PROVIDER = "resend"
  process.env.MAIL_FROM_DOMAIN = "example.test"
  process.env.RESEND_API_KEY = "integration-test-only"
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example"
  globalThis.fetch = async (input, init) => String(input) === "https://api.resend.com/emails"
    ? new Response("provider failed", { status: 500 }) : originalFetch(input, init)
  await expect(issuePasswordReset(user.email!)).rejects.toThrow("Password reset delivery failed")
  expect(await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id))).toHaveLength(0)
})

test("shared limits admit only the quota under concurrency and expire on database time", async () => {
  const key = `recovery-test:${randomUUID()}`
  const keyHash = createHash("sha256").update(key).digest("hex")
  try {
    const config = { maxRequests: 3, windowSeconds: 60 }
    const results = await Promise.all(Array.from({ length: 8 }, () => checkPersistentRateLimit(key, config)))
    expect(results.filter((result) => result.allowed)).toHaveLength(3)
    const denied = await checkPersistentRateLimit(key, config)
    expect(denied.allowed).toBe(false)
    if (!denied.allowed) expect(denied.retryAfter).toBeGreaterThan(0)
    await db.update(securityRateLimits).set({ resetAt: sql`clock_timestamp() - interval '1 second'` }).where(eq(securityRateLimits.key, keyHash))
    expect((await checkPersistentRateLimit(key, config)).allowed).toBe(true)
  } finally { await db.delete(securityRateLimits).where(eq(securityRateLimits.key, keyHash)) }
})
