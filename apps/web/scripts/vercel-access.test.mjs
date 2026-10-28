import assert from "node:assert/strict"
import { test } from "node:test"
import { verifyVercelAccess } from "./vercel-access.mjs"

const env = { VERCEL_TOKEN: "test-only-credential", VERCEL_ORG_ID: "team_test", VERCEL_PROJECT_ID: "prj_test" }
const project = { id: "prj_test", accountId: "team_test", rootDirectory: "apps/web", framework: "nextjs" }

test("project preflight validates the exact team and project without mutating resources", async () => {
  const result = await verifyVercelAccess(env, async (url, options) => {
    assert.equal(url.origin, "https://api.vercel.com")
    assert.equal(url.pathname, "/v9/projects/prj_test")
    assert.equal(url.searchParams.get("teamId"), "team_test")
    assert.equal(options.headers.Authorization, `Bearer ${env.VERCEL_TOKEN}`)
    assert.equal(options.method, undefined)
    assert.equal(options.redirect, "error")
    return Response.json(project)
  })
  assert.deepEqual(result, { id: "prj_test", accountId: "team_test" })
})
test("missing credentials fail before making any request", async () => {
  for (const name of Object.keys(env)) {
    await assert.rejects(verifyVercelAccess({ ...env, [name]: " " }, async () => {
      assert.fail("No provider request is allowed")
    }), new RegExp(name))
  }
})
test("authentication failures are distinct from project/team permission failures", async () => {
  for (const status of [401, 403, 404, 429, 500]) {
    await assert.rejects(verifyVercelAccess(env, async () => Response.json({ message: env.VERCEL_TOKEN }, { status })), error => {
      assert.equal(error.message.includes(env.VERCEL_TOKEN), false)
      assert.match(error.message, status === 401 ? /invalid, expired or revoked/ :
        status === 403 || status === 404 ? /project\/team scope/ : new RegExp(`HTTP ${status}`))
      return true
    })
  }
})
test("wrong projects, teams, roots and malformed responses fail closed", async () => {
  for (const change of [{ id: "prj_wrong" }, { accountId: "team_wrong" }, { rootDirectory: "apps/ios" }, { framework: "other" }]) {
    await assert.rejects(verifyVercelAccess(env, async () => Response.json({ ...project, ...change })))
  }
  await assert.rejects(verifyVercelAccess(env, async () => new Response("not JSON")), /Invalid Vercel/)
})
test("network exceptions cannot leak credential values", async () => {
  await assert.rejects(verifyVercelAccess(env, async () => { throw new Error(env.VERCEL_TOKEN) }), error => {
    assert.equal(error.message.includes(env.VERCEL_TOKEN), false)
    assert.match(error.message, /could not connect/)
    return true
  })
})
