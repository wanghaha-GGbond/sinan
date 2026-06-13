/**
 * Pure logic tests for circles — DEFAULT_CIRCLES shape + minTrustLevel
 * invariants. The full transactional behavior is exercised via the API
 * smoke during `next build` + manual; this file guards the
 * spec-mandated 圈配置不会在重构里漂掉.
 */
import { expect, test } from "@playwright/test"

import { DEFAULT_CIRCLES } from "../src/lib/server/circles"

test.describe("DEFAULT_CIRCLES — 首批 3 圈", () => {
  test("正好 3 个", () => {
    expect(DEFAULT_CIRCLES.length).toBe(3)
  })

  test("每个 circle 有 slug, name, description, minTrustLevel", () => {
    for (const c of DEFAULT_CIRCLES) {
      expect(c.slug).toBeTruthy()
      expect(c.name).toBeTruthy()
      expect(c.description).toBeTruthy()
      expect(Number.isInteger(c.minTrustLevel)).toBe(true)
    }
  })

  test("slug 唯一", () => {
    const slugs = DEFAULT_CIRCLES.map((c) => c.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  test("首批必须包含: 总监圈 / 出海圈 / 大模型圈", () => {
    const slugs = DEFAULT_CIRCLES.map((c) => c.slug)
    expect(slugs).toContain("director")
    expect(slugs).toContain("overseas")
    expect(slugs).toContain("llm")
  })

  test("总监圈 minTrustLevel ≥ 2 (spec 强制 L2+ 门槛)", () => {
    const director = DEFAULT_CIRCLES.find((c) => c.slug === "director")
    expect(director).toBeDefined()
    expect(director!.minTrustLevel).toBeGreaterThanOrEqual(2)
  })

  test("出海圈 + 大模型圈 minTrustLevel ≥ 1", () => {
    const overseas = DEFAULT_CIRCLES.find((c) => c.slug === "overseas")
    const llm = DEFAULT_CIRCLES.find((c) => c.slug === "llm")
    expect(overseas!.minTrustLevel).toBeGreaterThanOrEqual(1)
    expect(llm!.minTrustLevel).toBeGreaterThanOrEqual(1)
  })

  test("minTrustLevel 不会超过合理上限 (3, 总监圈已经稀缺)", () => {
    for (const c of DEFAULT_CIRCLES) {
      expect(c.minTrustLevel).toBeLessThanOrEqual(3)
    }
  })
})
