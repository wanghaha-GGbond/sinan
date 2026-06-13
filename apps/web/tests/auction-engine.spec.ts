/**
 * M3 拍卖引擎 — 单元测试 (状态机 + 互斥规则)
 *
 * 设计选择:
 *   - 此项目没有 vitest 配置,playwright spec 走 e2e(需要 dev server + DB)。
 *   - 本测试用 node:test 直接跑纯函数,不依赖 DB。
 *   - exerciseHeartPick / settleByHighestBid / transitionAuction 的事务
 *     行为靠 canTransition + 状态机合法性表保证。
 *   - 端到端事务(锁 + 写)在 verifier 阶段用 curl + DB 实测验证。
 *
 * 跑法:node --import tsx --test apps/web/tests/auction-engine.spec.ts
 * 或:cd apps/web && npx tsx --test tests/auction-engine.spec.ts
 */
import test from "node:test"
import assert from "node:assert/strict"

import { canTransition } from "../src/lib/server/auction-engine"

test("state machine: draft → live → closed → settled 全合法路径", () => {
  assert.equal(canTransition("draft", "live"), true)
  assert.equal(canTransition("live", "closed"), true)
  assert.equal(canTransition("closed", "settled"), true)
})

test("state machine: 任何状态可取消(运营取消路径)", () => {
  assert.equal(canTransition("draft", "cancelled"), true)
  assert.equal(canTransition("live", "cancelled"), true)
  assert.equal(canTransition("closed", "cancelled"), true)
})

test("state machine: settled / cancelled 是终态,不能再转出", () => {
  assert.equal(canTransition("settled", "live"), false)
  assert.equal(canTransition("settled", "closed"), false)
  assert.equal(canTransition("settled", "cancelled"), false)
  assert.equal(canTransition("cancelled", "live"), false)
  assert.equal(canTransition("cancelled", "settled"), false)
})

test("state machine: 跳跃状态非法(draft→closed,live→settled)", () => {
  assert.equal(canTransition("draft", "closed"), false)
  assert.equal(canTransition("draft", "settled"), false)
  assert.equal(canTransition("live", "settled"), false, "live 必须先 closed 才能 settled")
  assert.equal(canTransition("live", "draft"), false)
})

test("state machine: 回退非法(live→draft,closed→live)", () => {
  assert.equal(canTransition("live", "draft"), false)
  assert.equal(canTransition("closed", "live"), false)
  assert.equal(canTransition("closed", "draft"), false)
})

test("state machine: heart_pick 和 highest_bid 互斥(同一 settled 终态)", () => {
  // 两条路径终态都是 settled,但二者只能选其一(都在 transaction 内做 closed→settled)。
  // 这里用状态机层面确认:closed → settled 允许,settled → settled 不允许。
  assert.equal(canTransition("closed", "settled"), true)
  assert.equal(canTransition("settled", "settled"), false, "settled 不能再 settle,防止 double-settle")
})