import { expect, test } from "@playwright/test"
import { NextRequest } from "next/server"
import { createRegistrationCode, isRegistrationCode, normalizeRegistrationEmail,
  registrationCodeHash, registrationEmailHash } from "../src/lib/server/registration-code-policy"
import { POST as requestCode } from "../src/app/api/auth/register-code/route"
import { POST as register } from "../src/app/api/auth/register/route"
import { GET as registrationConfig } from "../src/app/api/config/register/route"

const previous = { ...process.env }
test.afterEach(() => {
  for (const key of ["AUTH_SECRET", "DATABASE_URL", "MAIL_PROVIDER", "MAIL_FROM_DOMAIN", "RESEND_API_KEY", "INVITE_REQUIRED", "ALLOW_DEV_AUTH", "NEXT_PUBLIC_APP_ENV"]) {
    if (previous[key] === undefined) delete process.env[key]
    else process.env[key] = previous[key]
  }
})

test("registration availability reflects current mail configuration and is never cached", async () => {
  process.env.INVITE_REQUIRED = "true"
  process.env.MAIL_PROVIDER = "disabled"
  const unavailable = await registrationConfig()
  expect(unavailable.headers.get("cache-control")).toBe("no-store")
  expect(await unavailable.json()).toEqual({
    inviteRequired: true, emailVerificationRequired: true, emailDeliveryAvailable: false,
  })
  process.env.DATABASE_URL = "postgresql://test.invalid/registration_test"
  process.env.MAIL_PROVIDER = "resend"
  process.env.MAIL_FROM_DOMAIN = "mail.example.test"
  process.env.RESEND_API_KEY = "configuration-test-only-not-a-provider-key"
  expect((await (await registrationConfig()).json()).emailDeliveryAvailable).toBe(true)
})

test("registration normalizes email and rejects non-email input", () => {
  expect(normalizeRegistrationEmail(" Name@Example.com ")).toBe("name@example.com")
  for (const value of [null, {}, [], "bad", "a".repeat(255) + "@example.com"]) expect(normalizeRegistrationEmail(value)).toBeNull()
})

test("codes are random six-digit values and their hashes bind email, challenge and secret", () => {
  const codes = Array.from({ length: 20 }, createRegistrationCode)
  expect(new Set(codes).size).toBeGreaterThan(1)
  for (const code of codes) expect(isRegistrationCode(code)).toBe(true)
  for (const value of [null, 123456, "12345", "1234567", "12a456", "123456\n"]) expect(isRegistrationCode(value)).toBe(false)
  process.env.AUTH_SECRET = "test-registration-secret-12345678901234567890"
  const hash = registrationCodeHash("a@example.test", "challenge-a", codes[0])
  expect(hash).toHaveLength(64)
  expect(hash).not.toBe(codes[0])
  expect(hash).not.toBe(registrationCodeHash("b@example.test", "challenge-a", codes[0]))
  expect(hash).not.toBe(registrationCodeHash("a@example.test", "challenge-b", codes[0]))
  expect(registrationEmailHash("a@example.test")).not.toContain("@")
  process.env.AUTH_SECRET = "different-registration-secret-12345678901234567890"
  expect(hash).not.toBe(registrationCodeHash("a@example.test", "challenge-a", codes[0]))
})

test("registration secrets must be configured before a code can be stored", () => {
  delete process.env.AUTH_SECRET
  expect(() => registrationCodeHash("a@example.test", "id", "123456")).toThrow()
})

test("no browser or native client can skip the email code or register an unverified phone", async () => {
  process.env.NEXT_PUBLIC_APP_ENV = "production"
  process.env.ALLOW_DEV_AUTH = "true"
  delete process.env.DATABASE_URL
  for (const client of ["web", "ios"]) {
    for (const body of [
      { email: "person@example.test", password: "RegistrationTest123!" },
      { phone: "13800138000", password: "RegistrationTest123!" },
      { email: "person@example.test", password: "RegistrationTest123!", verificationCode: "12a456" },
    ]) {
      const response = await register(new NextRequest("https://example.test/api/auth/register", {
        method: "POST", headers: { "x-sinan-client": client }, body: JSON.stringify(body),
      }))
      expect(response.status).toBe(400)
    }
  }
})

test("disabled mail returns an error rather than a fake code-sent result", async () => {
  process.env.INVITE_REQUIRED = "false"
  process.env.MAIL_PROVIDER = "disabled"
  const response = await requestCode(new NextRequest("https://example.test/api/auth/register-code", {
    method: "POST", body: JSON.stringify({ email: "person@example.test" }),
  }))
  expect(response.status).toBe(503)
  expect(response.headers.get("cache-control")).toBe("no-store")
  expect(await response.json()).toHaveProperty("error")
})

test("malformed code requests and missing invitations fail before delivery", async () => {
  for (const body of [null, [], {}, { email: "bad" }]) {
    const response = await requestCode(new NextRequest("https://example.test", { method: "POST", body: JSON.stringify(body) }))
    expect(response.status).toBe(400)
  }
  process.env.INVITE_REQUIRED = "true"
  const response = await requestCode(new NextRequest("https://example.test", {
    method: "POST", body: JSON.stringify({ email: "person@example.test" }),
  }))
  expect(response.status).toBe(403)
})
