import { test } from "node:test"
import assert from "node:assert/strict"
import { releaseTestProxyHeaders } from "./release-network.mjs"

test("only loopback release tests simulate a trusted proxy", () => {
  for (const url of [undefined, "http://127.0.0.1:3000", "http://localhost:3000", "http://[::1]:3000"]) {
    assert.deepEqual(releaseTestProxyHeaders("1234abcdef", url), { "cf-connecting-ip": "2001:db8:1234:abcd::1" })
  }
})
test("remote release tests never forge Cloudflare client headers", () => {
  for (const url of ["https://staging.zaichang.space", "https://example.vercel.app", "https://zaichang.space", "https://localhost.evil.test"]) {
    assert.deepEqual(releaseTestProxyHeaders("1234abcdef", url), {})
  }
  assert.throws(() => releaseTestProxyHeaders("1234abcdef", "not a URL"))
})
