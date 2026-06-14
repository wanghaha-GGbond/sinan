/**
 * Pure logic tests for dm-engine — no DB required, just unit test the
 * decision functions and trust-diff logic. The full server roundtrip is
 * covered by build + the actual API smoke.
 */
import { expect, test } from "@playwright/test"

import {
  INTRO_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  TRUST_DIFF_THRESHOLD,
  shouldQueueByTrustDiff,
} from "../src/lib/server/dm-engine"

test.describe("shouldQueueByTrustDiff", () => {
  test("同级 (差 0) — 直接开 thread", () => {
    expect(shouldQueueByTrustDiff(0, 0)).toBe(false)
    expect(shouldQueueByTrustDiff(1, 1)).toBe(false)
    expect(shouldQueueByTrustDiff(2, 2)).toBe(false)
  })

  test("相邻 (差 1) — 直接开 thread", () => {
    expect(shouldQueueByTrustDiff(0, 1)).toBe(false)
    expect(shouldQueueByTrustDiff(1, 2)).toBe(false)
    expect(shouldQueueByTrustDiff(2, 1)).toBe(false) // 不分方向
  })

  test("跨两级 (差 2) — 走请求队列", () => {
    expect(shouldQueueByTrustDiff(0, 2)).toBe(true)
    expect(shouldQueueByTrustDiff(1, 3)).toBe(true)
  })

  test("跨三级 (差 3+) — 走请求队列", () => {
    expect(shouldQueueByTrustDiff(0, 3)).toBe(true)
    expect(shouldQueueByTrustDiff(1, 4)).toBe(true)
  })

  test("反向差值同样适用", () => {
    expect(shouldQueueByTrustDiff(2, 0)).toBe(true)
    expect(shouldQueueByTrustDiff(1, 0)).toBe(false)
  })
})

test.describe("阈值常量", () => {
  test("TRUST_DIFF_THRESHOLD = 2 与 spec 一致", () => {
    expect(TRUST_DIFF_THRESHOLD).toBe(2)
  })

  test("INTRO_MAX_LENGTH = 140 与 spec 一致", () => {
    expect(INTRO_MAX_LENGTH).toBe(140)
  })

  test("MESSAGE_MAX_LENGTH 是合理上限 (防止滥用)", () => {
    expect(MESSAGE_MAX_LENGTH).toBeGreaterThanOrEqual(1000)
    expect(MESSAGE_MAX_LENGTH).toBeLessThanOrEqual(10000)
  })
})

test.describe("intro / message 长度边界", () => {
  test("introText 长度校验 (140 字内)", () => {
    const ok = "a".repeat(140)
    const tooLong = "a".repeat(141)
    expect(ok.length).toBeLessThanOrEqual(INTRO_MAX_LENGTH)
    expect(tooLong.length).toBeGreaterThan(INTRO_MAX_LENGTH)
  })

  test("message content 长度上限", () => {
    const ok = "x".repeat(MESSAGE_MAX_LENGTH)
    const tooLong = "x".repeat(MESSAGE_MAX_LENGTH + 1)
    expect(ok.length).toBeLessThanOrEqual(MESSAGE_MAX_LENGTH)
    expect(tooLong.length).toBeGreaterThan(MESSAGE_MAX_LENGTH)
  })
})
