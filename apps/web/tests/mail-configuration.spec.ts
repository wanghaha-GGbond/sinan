import { expect, test } from "@playwright/test"
import { mailConfigurationErrors, resendSender } from "../src/lib/server/mail-configuration.mjs"
import { isMailConfigured, sendMail } from "../src/lib/server/mail"
import { GET as readiness } from "../src/app/api/health/ready/route"
import { GET as registrationConfig } from "../src/app/api/config/register/route"

const saved = { ...process.env }
const savedFetch = globalThis.fetch
const keys = ["DATABASE_URL", "DATABASE_ADAPTER", "AUTH_SECRET", "CRON_SECRET", "MAIL_PROVIDER", "MAIL_FROM_DOMAIN", "RESEND_API_KEY", "MAIL_FROM_ADDRESS", "MAIL_TEST_RECIPIENT", "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_APP_URL", "SUPPORT_EMAIL", "APP_RELEASE", "ERROR_REPORTING_MODE", "DEPLOYMENT_REGION", "INVITE_REQUIRED", "NEXT_PUBLIC_API_ENABLED", "NEXT_PUBLIC_PULSE_ENABLED", "LAUNCH_SCOPE_ONLY"]
test.afterEach(() => {
  globalThis.fetch = savedFetch
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

const fixture = {
  DATABASE_URL: "postgresql://test.invalid/mail_test",
  NEXT_PUBLIC_APP_ENV: "production", MAIL_PROVIDER: "resend", MAIL_FROM_DOMAIN: "mail.example.test",
  RESEND_API_KEY: "test-only-not-a-real-key",
}

test("blank credentials, malformed domains and mismatched senders are not configured", () => {
  expect(mailConfigurationErrors(fixture)).toEqual([])
  expect(resendSender(fixture)).toBe("no-reply@mail.example.test")
  for (const overrides of [{ RESEND_API_KEY: " " }, { MAIL_FROM_DOMAIN: "https://mail.example.test" },
    { MAIL_FROM_DOMAIN: "mail.example.test\nattacker" }, { MAIL_FROM_ADDRESS: "sender@other.test" }]) {
    Object.assign(process.env, fixture, { MAIL_FROM_ADDRESS: "", MAIL_TEST_RECIPIENT: "" }, overrides)
    expect(isMailConfigured()).toBe(false)
  }
})

test("Resend shared sender fails closed except for an explicitly restricted staging test", () => {
  const sandbox = { ...fixture, MAIL_FROM_DOMAIN: "resend.dev", MAIL_FROM_ADDRESS: "onboarding@resend.dev" }
  expect(mailConfigurationErrors(sandbox).length).toBeGreaterThan(0)
  expect(mailConfigurationErrors({ ...sandbox, NEXT_PUBLIC_APP_ENV: "staging" }).length).toBeGreaterThan(0)
  const restricted = { ...sandbox, NEXT_PUBLIC_APP_ENV: "staging", MAIL_TEST_RECIPIENT: "owner@example.test" }
  expect(mailConfigurationErrors(restricted)).toEqual([])
  expect(mailConfigurationErrors({ ...restricted, NEXT_PUBLIC_APP_ENV: "production" }).length).toBeGreaterThan(0)
  expect(mailConfigurationErrors({ ...restricted, MAIL_TEST_RECIPIENT: "bad" }).length).toBeGreaterThan(0)
})

test("test recipient restriction is enforced before contacting the provider", async () => {
  Object.assign(process.env, fixture, { NEXT_PUBLIC_APP_ENV: "staging", MAIL_FROM_DOMAIN: "resend.dev",
    MAIL_FROM_ADDRESS: "onboarding@resend.dev", MAIL_TEST_RECIPIENT: "owner@example.test" })
  let calls = 0
  globalThis.fetch = async (_input, init) => {
    calls++
    expect(JSON.parse(String(init?.body))).toMatchObject({ from: "onboarding@resend.dev", to: ["OWNER@example.test"] })
    return Response.json({ id: "test-message" })
  }
  await expect(sendMail({ to: "other@example.test", subject: "test", text: "test" })).rejects.toThrow("not allowed")
  expect(calls).toBe(0)
  await sendMail({ to: "OWNER@example.test", subject: "test", text: "test" })
  expect(calls).toBe(1)
})

test("provider failures never echo message bodies or report success", async () => {
  Object.assign(process.env, fixture, { MAIL_FROM_ADDRESS: "", MAIL_TEST_RECIPIENT: "" })
  globalThis.fetch = async () => Response.json({ message: "private recipient and code" }, { status: 403 })
  await expect(sendMail({ to: "owner@example.test", subject: "test", text: "private-code" })).rejects.toThrow("Resend API error 403")
})

test("readiness rejects invalid mail config without checking the database", async () => {
  Object.assign(process.env, fixture, {
    DATABASE_ADAPTER: "neon", AUTH_SECRET: "test-only-readiness-secret-12345678901234567890", CRON_SECRET: "test-only",
    NEXT_PUBLIC_APP_URL: "https://example.test", SUPPORT_EMAIL: "support@example.test", APP_RELEASE: "a".repeat(40),
    ERROR_REPORTING_MODE: "stdout", DEPLOYMENT_REGION: "global", INVITE_REQUIRED: "true", NEXT_PUBLIC_API_ENABLED: "true",
    NEXT_PUBLIC_PULSE_ENABLED: "false", LAUNCH_SCOPE_ONLY: "true", MAIL_FROM_DOMAIN: "resend.dev", MAIL_FROM_ADDRESS: "", MAIL_TEST_RECIPIENT: "",
  })
  const response = await readiness()
  expect(response.status).toBe(503)
  expect(await response.json()).toMatchObject({ configuration: "invalid", database: "not_checked" })
  expect((await (await registrationConfig()).json()).emailDeliveryAvailable).toBe(false)
})
