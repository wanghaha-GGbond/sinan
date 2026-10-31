import { test } from "node:test"
import assert from "node:assert/strict"
import { authContract, digest, releaseConfiguration, verifyRelease, verifyRollback } from "./cloudflare-release-policy.mjs"

const sha = "a".repeat(40)
const fixture = { CF_MAIL_FROM_DOMAIN: "mail.example.invalid", CF_SUPPORT_EMAIL: "support@example.invalid", CF_VALIDATION_ONLY: "true" }
const good = { format: 1, target: "production", worker: "zaichang", release: sha, authContract, migration: "0021_password_recovery", dirty: false, validationOnly: false, configDigest: "config", bundleDigest: "bundle" }
const expected = { target: "production", release: sha, configDigest: "config", bundleDigest: "bundle" }

test("targets are explicit and secrets are never copied into Worker vars", () => {
  for (const target of [undefined, "", "prod", "beta"]) assert.throws(() => releaseConfiguration(target, {}, sha))
  const config = releaseConfiguration("staging", { DATABASE_URL: "secret", RESEND_API_KEY: "secret", NEXT_PUBLIC_APP_ENV: "production" }, sha)
  assert.equal(config.name, "zaichang-staging")
  assert.equal(config.vars.NEXT_PUBLIC_APP_ENV, "staging")
  assert.equal(config.vars.MAIL_PROVIDER, "disabled")
  assert.equal(config.vars.INVITE_REQUIRED, "true")
  assert.equal(config.vars.NEXT_PUBLIC_PULSE_ENABLED, "true")
  assert.equal(JSON.stringify(config).includes("secret"), false)
})
test("production uses the owned domain, retains the fallback, disables demo and requires real mail configuration", () => {
  assert.throws(() => releaseConfiguration("production", {}, sha))
  assert.throws(() => releaseConfiguration("production", { ...fixture, CF_VALIDATION_ONLY: "false" }, sha))
  const config = releaseConfiguration("production", fixture, sha)
  assert.equal(config.name, "zaichang")
  assert.equal(config.vars.NEXT_PUBLIC_APP_URL, "https://zaichang.space")
  assert.equal(config.workers_dev, true)
  assert.deepEqual(config.routes, [{ pattern: "zaichang.space", custom_domain: true, zone_name: "zaichang.space" }])
  assert.equal(releaseConfiguration("staging", {}, sha).routes, undefined)
  assert.equal(config.vars.NEXT_PUBLIC_PULSE_ENABLED, "false")
  assert.equal(config.vars.MAIL_PROVIDER, "resend")
  assert.equal(config.vars.INVITE_REQUIRED, "false")
  assert.equal(config.preview_urls, false)
})
test("release rejects dirty, validation-only, modified and wrong-environment artifacts", () => {
  assert.doesNotThrow(() => verifyRelease(good, expected))
  for (const change of [{ dirty: true }, { validationOnly: true }, { target: "staging" }, { release: "b".repeat(40) }, { configDigest: "changed" }, { bundleDigest: "changed" }, { authContract: 0 }, { format: 2 }]) {
    assert.throws(() => verifyRelease({ ...good, ...change }, expected))
  }
})
test("rollback rejects pre-password-recovery releases and cross-migration/environment targets", () => {
  const previous = { ...good, release: "b".repeat(40) }
  assert.doesNotThrow(() => verifyRollback(good, previous))
  for (const change of [{ authContract: undefined }, { authContract: 0 }, { authContract: 1 }, { migration: "0020_old" }, { worker: "zaichang-staging" }, { target: "staging" }, { dirty: true }, { validationOnly: true }, { release: sha }, { release: "not-a-sha" }]) {
    assert.throws(() => verifyRollback(good, { ...previous, ...change }))
  }
})
test("file digests change with contents", () => {
  assert.equal(digest("config"), digest(Buffer.from("config")))
  assert.notEqual(digest("config"), digest("changed"))
})
