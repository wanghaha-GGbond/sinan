import { test } from "node:test"
import assert from "node:assert/strict"
import { withIsolatedPool } from "../src/db/isolated-pool.mjs"

test("a transaction closes its own connection before returning", async () => {
  const events = []
  const value = await withIsolatedPool(() => ({ async end() { events.push("closed") } }), async () => {
    events.push("committed")
    return 7
  })
  assert.equal(value, 7)
  assert.deepEqual(events, ["committed", "closed"])
})
test("rollback and callback errors still close the operation pool", async () => {
  let closed = 0
  const failure = new Error("rollback")
  await assert.rejects(withIsolatedPool(() => ({ async end() { closed++ } }), async () => { throw failure }), error => error === failure)
  assert.equal(closed, 1)
})
test("concurrent and sequential requests never share a pool", async () => {
  const pools = []
  let release
  const barrier = new Promise(resolve => { release = resolve })
  const create = () => {
    const pool = { closed: false, async end() { this.closed = true } }
    pools.push(pool)
    return pool
  }
  const first = withIsolatedPool(create, async pool => { await barrier; assert.equal(pool.closed, false) })
  const second = withIsolatedPool(create, async pool => { assert.notEqual(pool, pools[0]); release() })
  await Promise.all([first, second])
  await withIsolatedPool(create, async pool => { assert.equal(pool.closed, false) })
  assert.equal(new Set(pools).size, 3)
  assert.ok(pools.every(pool => pool.closed))
})
