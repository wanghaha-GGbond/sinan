import { expect, test } from "@playwright/test"
import { NextRequest } from "next/server"
import { SignJWT } from "jose"
import { createPasswordResetToken, hashPasswordResetToken, isCurrentSession,
  isNewPasswordValid, isPasswordResetToken, passwordResetUrl } from "../src/lib/server/password-recovery-policy"
import { getAuthClientKey } from "../src/lib/server/auth-rate-limit"
import { signToken, verifyToken } from "../src/lib/server/auth"
import { POST as forgotPassword } from "../src/app/api/auth/forgot-password/route"
import { POST as resetPassword } from "../src/app/api/auth/reset-password/route"
import { checkPersistentRateLimit } from "../src/lib/server/persistent-rate-limit"

const saved = { ...process.env }
test.afterEach(() => {
  for (const key of ["AUTH_SECRET", "AUTH_TRUSTED_IP_HEADER", "MAIL_PROVIDER", "DATABASE_URL", "NEXT_PUBLIC_APP_ENV", "ALLOW_DEV_AUTH"]) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

test("reset tokens are random, hashed and strictly validated", () => {
  const a = createPasswordResetToken(), b = createPasswordResetToken()
  expect(a).not.toBe(b)
  expect(isPasswordResetToken(a)).toBe(true)
  expect(hashPasswordResetToken(a)).not.toBe(a)
  expect(hashPasswordResetToken(a)).toBe(hashPasswordResetToken(a))
  for (const value of [null, {}, "a".repeat(63), "g".repeat(64), a + "\n"]) expect(isPasswordResetToken(value)).toBe(false)
})

test("password reset link uses only the configured HTTPS origin and a fragment", () => {
  const token = createPasswordResetToken()
  const url = new URL(passwordResetUrl(token, "https://app.example/path?old=1"))
  expect(url.origin).toBe("https://app.example")
  expect(url.pathname).toBe("/reset-password")
  expect(url.search).toBe("")
  expect(url.hash).toBe(`#token=${token}`)
  expect(() => passwordResetUrl(token, "http://app.example")).toThrow()
  expect(() => passwordResetUrl(token, "https://user:password@app.example")).toThrow()
})

test("new password length is bounded and never silently truncated", () => {
  expect(isNewPasswordValid("a".repeat(7))).toBe(false)
  expect(isNewPasswordValid("a".repeat(8))).toBe(true)
  expect(isNewPasswordValid("a".repeat(128))).toBe(true)
  expect(isNewPasswordValid("a".repeat(129))).toBe(false)
  expect(isNewPasswordValid({})).toBe(false)
})

test("legacy sessions survive migration, but not password reset", async () => {
  process.env.AUTH_SECRET = "unit-only-recovery-secret-not-for-deployment"
  const legacy = await new SignJWT({ sub: "user-id", role: "user" }).setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h").sign(new TextEncoder().encode(process.env.AUTH_SECRET))
  const old = await verifyToken(legacy)
  expect(old?.sessionVersion).toBe(0)
  expect(isCurrentSession(old?.sessionVersion, 0)).toBe(true)
  expect(isCurrentSession(old?.sessionVersion, 1)).toBe(false)
  const fresh = await verifyToken(await signToken({ userId: "user-id", role: "user", sessionVersion: 1 }))
  expect(isCurrentSession(fresh?.sessionVersion, 1)).toBe(true)
})

test("auth limits ignore arbitrary forwarded-for and use the configured trusted header", () => {
  delete process.env.AUTH_TRUSTED_IP_HEADER
  expect(getAuthClientKey(new Request("https://app.example", { headers: { "x-forwarded-for": "1.2.3.4" } }))).toBe("unknown")
  expect(getAuthClientKey(new Request("https://app.example", { headers: {
    "cf-connecting-ip": "2001:db8::1", "x-forwarded-for": "1.2.3.4",
  } }))).toBe("2001:db8::1")
  process.env.AUTH_TRUSTED_IP_HEADER = "x-vercel-forwarded-for"
  expect(getAuthClientKey(new Request("https://app.example", { headers: { "x-vercel-forwarded-for": "192.0.2.1" } }))).toBe("192.0.2.1")
})

test("deployed limits fail closed without a database", async () => {
  delete process.env.DATABASE_URL
  process.env.NEXT_PUBLIC_APP_ENV = "staging"
  process.env.ALLOW_DEV_AUTH = "true"
  expect((await checkPersistentRateLimit("unit-no-db", { maxRequests: 3, windowSeconds: 60 })).allowed).toBe(false)
})

test("disabled mail rejects recovery uniformly instead of pretending to send", async () => {
  process.env.MAIL_PROVIDER = "disabled"
  for (const email of ["existing@example.test", "unknown@example.test"]) {
    const response = await forgotPassword(new NextRequest("https://app.example/api/auth/forgot-password", {
      method: "POST", body: JSON.stringify({ email }),
    }))
    expect(response.status).toBe(503)
    expect(response.headers.get("cache-control")).toBe("no-store")
  }
})

test("recovery endpoints reject malformed bodies before database or mail access", async () => {
  for (const body of [null, [], {}, { email: "bad" }]) {
    expect((await forgotPassword(new NextRequest("https://app.example/api/auth/forgot-password", {
      method: "POST", body: JSON.stringify(body),
    }))).status).toBe(400)
    expect((await resetPassword(new NextRequest("https://app.example/api/auth/reset-password", {
      method: "POST", body: JSON.stringify(body),
    }))).status).toBe(400)
  }
})
