import assert from "node:assert/strict"
import { test } from "node:test"
import { spawnSync } from "node:child_process"
import { registrationConfigurationErrors } from "../src/lib/server/registration-configuration.mjs"

const publicRegistration = { INVITE_REQUIRED: "false", NEXT_PUBLIC_APP_ENV: "production", DEPLOYMENT_REGION: "global" }
test("only explicit global production can open email registration", () => {
  assert.deepEqual(registrationConfigurationErrors(publicRegistration), [])
  assert.deepEqual(registrationConfigurationErrors({ INVITE_REQUIRED: "true" }), [])
  for (const change of [
    { INVITE_REQUIRED: undefined }, { INVITE_REQUIRED: "" }, { INVITE_REQUIRED: "False" },
    { NEXT_PUBLIC_APP_ENV: "staging" }, { NEXT_PUBLIC_APP_ENV: "development" },
    { DEPLOYMENT_REGION: undefined }, { DEPLOYMENT_REGION: "mainland" },
  ]) assert.ok(registrationConfigurationErrors({ ...publicRegistration, ...change }).length > 0)
})

test("release checks allow public registration without weakening production email requirements", () => {
  const env = {
    ...publicRegistration, AUTH_SECRET: "test-only-registration-policy-secret-123456",
    DATABASE_URL: "postgresql://test:test@localhost/test", DATABASE_ADAPTER: "neon",
    CRON_SECRET: "test-only", MAIL_PROVIDER: "resend", MAIL_FROM_DOMAIN: "mail.example.com",
    RESEND_API_KEY: "test-only-not-a-real-key", APP_RELEASE: "a".repeat(40),
    NEXT_PUBLIC_APP_URL: "https://example.com", SUPPORT_EMAIL: "support@example.com",
    ERROR_REPORTING_MODE: "stdout", NEXT_PUBLIC_API_ENABLED: "true",
    NEXT_PUBLIC_PULSE_ENABLED: "false", LAUNCH_SCOPE_ONLY: "true",
  }
  const check = (change = {}) => spawnSync(process.execPath, [new URL("./check-release-env.mjs", import.meta.url).pathname], { env: { ...env, ...change }, encoding: "utf8" })
  assert.equal(check().status, 0)
  for (const change of [{ RESEND_API_KEY: "" }, { MAIL_PROVIDER: "disabled" }, { MAIL_TEST_RECIPIENT: "test@example.com" }]) {
    assert.notEqual(check(change).status, 0)
  }
})
