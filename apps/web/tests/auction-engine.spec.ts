/**
 * M3 拍卖引擎 — 单元测试 (状态机 + 互斥规则)
 *
 * 设计选择:
 *   - 使用独立的 Playwright unit config，不启动 dev server，也不依赖 DB。
 *   - exerciseHeartPick / settleByHighestBid / transitionAuction 的事务
 *     行为靠 canTransition + 状态机合法性表保证。
 *   - 端到端事务(锁 + 写)在 verifier 阶段用 curl + DB 实测验证。
 *
 * 跑法: npm run test:unit
 */
import { expect, test } from "@playwright/test"

import { canTransition } from "../src/lib/server/auction-engine"

test("state machine: draft → live → closed → settled 全合法路径", () => {
  expect(canTransition("draft", "live")).toBe(true)
  expect(canTransition("live", "closed")).toBe(true)
  expect(canTransition("closed", "settled")).toBe(true)
})

test("state machine: 任何状态可取消(运营取消路径)", () => {
  expect(canTransition("draft", "cancelled")).toBe(true)
  expect(canTransition("live", "cancelled")).toBe(true)
  expect(canTransition("closed", "cancelled")).toBe(true)
})

test("state machine: settled / cancelled 是终态,不能再转出", () => {
  expect(canTransition("settled", "live")).toBe(false)
  expect(canTransition("settled", "closed")).toBe(false)
  expect(canTransition("settled", "cancelled")).toBe(false)
  expect(canTransition("cancelled", "live")).toBe(false)
  expect(canTransition("cancelled", "settled")).toBe(false)
})

test("state machine: 跳跃状态非法(draft→closed,live→settled)", () => {
  expect(canTransition("draft", "closed")).toBe(false)
  expect(canTransition("draft", "settled")).toBe(false)
  expect(canTransition("live", "settled"), "live 必须先 closed 才能 settled").toBe(false)
  expect(canTransition("live", "draft")).toBe(false)
})

test("state machine: 回退非法(live→draft,closed→live)", () => {
  expect(canTransition("live", "draft")).toBe(false)
  expect(canTransition("closed", "live")).toBe(false)
  expect(canTransition("closed", "draft")).toBe(false)
})

test("state machine: heart_pick 和 highest_bid 互斥(同一 settled 终态)", () => {
  // 两条路径终态都是 settled,但二者只能选其一(都在 transaction 内做 closed→settled)。
  // 这里用状态机层面确认:closed → settled 允许,settled → settled 不允许。
  expect(canTransition("closed", "settled")).toBe(true)
  expect(canTransition("settled", "settled"), "settled 不能再 settle,防止 double-settle").toBe(false)
})
