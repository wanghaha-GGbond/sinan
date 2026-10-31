import assert from "node:assert/strict"
import test from "node:test"
import { stagingMailConfiguration } from "./staging-mail.mjs"

test("staging mail stays disabled unless explicitly enabled and clears inherited credentials", () => {
  assert.deepEqual(stagingMailConfiguration({ NEXT_PUBLIC_APP_ENV: "staging", RESEND_API_KEY: "unused", MAIL_TEST_RECIPIENT: "owner@example.test" }), {
    MAIL_PROVIDER: "disabled", MAIL_FROM_DOMAIN: "example.invalid", MAIL_FROM_ADDRESS: "", MAIL_TEST_RECIPIENT: "", RESEND_API_KEY: "",
  })
})

test("the sandbox requires an explicit recipient and valid credentials", () => {
  const env = { NEXT_PUBLIC_APP_ENV: "staging", STAGING_MAIL_TEST_ENABLED: "true" }
  assert.throws(() => stagingMailConfiguration(env), /MAIL_TEST_RECIPIENT/)
  assert.throws(() => stagingMailConfiguration({ ...env, MAIL_TEST_RECIPIENT: "owner@example.test" }), /RESEND_API_KEY/)
  assert.throws(() => stagingMailConfiguration({ ...env, MAIL_TEST_RECIPIENT: "invalid", RESEND_API_KEY: "test-key" }), /valid address/)
  assert.deepEqual(stagingMailConfiguration({ ...env, MAIL_TEST_RECIPIENT: "owner@example.test", RESEND_API_KEY: "test-key" }), {
    MAIL_PROVIDER: "resend", MAIL_FROM_DOMAIN: "resend.dev", MAIL_FROM_ADDRESS: "onboarding@resend.dev",
  })
})

test("the sandbox cannot be activated outside staging or by a misspelled flag", () => {
  for (const NEXT_PUBLIC_APP_ENV of [undefined, "production", "development"]) {
    assert.throws(() => stagingMailConfiguration({ NEXT_PUBLIC_APP_ENV, STAGING_MAIL_TEST_ENABLED: "true" }), /requires staging/)
  }
  assert.throws(() => stagingMailConfiguration({ NEXT_PUBLIC_APP_ENV: "staging", STAGING_MAIL_TEST_ENABLED: "yes" }), /true or false/)
})
