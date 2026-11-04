import assert from "node:assert/strict"
import test from "node:test"
import { releaseProtectionHeaders, releaseRequestOptions, redactReleaseCredential } from "./release-vercel-auth.mjs"

const env = { RELEASE_BASE_URL: "https://candidate.vercel.app", RELEASE_VERCEL_OIDC_TOKEN: "test-only-short-lived-credential" }

test("Preview credential is attached only to the exact HTTPS origin", () => {
  assert.equal(releaseProtectionHeaders(`${env.RELEASE_BASE_URL}/api/health/live`, {}, env)["x-vercel-trusted-oidc-idp-token"], env.RELEASE_VERCEL_OIDC_TOKEN)
  for (const url of ["https://other.vercel.app", "https://external.example", "http://candidate.vercel.app", "https://candidate.vercel.app.evil.test"]) {
    assert.deepEqual(releaseProtectionHeaders(url, { "X-Vercel-Trusted-Oidc-Idp-Token": "stale", accept: "application/json" }, env), { accept: "application/json" })
  }
  assert.throws(() => releaseProtectionHeaders("https://example.test", {}, { ...env, RELEASE_BASE_URL: "https://example.test" }), /HTTPS Vercel Preview/)
})

test("API authorization preserves application headers and cannot follow redirects or leave Preview", () => {
  const options = releaseRequestOptions("/api/auth/register", { headers: { authorization: "Bearer app-session" }, data: { email: "example@test.invalid" } }, env)
  assert.equal(options.headers.authorization, "Bearer app-session")
  assert.equal(options.maxRedirects, 0)
  assert.throws(() => releaseRequestOptions("https://other.vercel.app/api", {}, env), /verified Preview origin/)
  assert.deepEqual(releaseRequestOptions("/api/health/live", { timeout: 1000 }, {}), { timeout: 1000 })
})

test("test diagnostics redact the temporary protection credential", () => {
  assert.equal(redactReleaseCredential(`request: ${env.RELEASE_VERCEL_OIDC_TOKEN}`, env), "request: [redacted]")
})
