import { expect, test } from "@playwright/test"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import sources from "../src/data/company-logo-sources.json"
import { companyLogo } from "../src/lib/company-logo"

test("bundled logos match reviewed identities and source checksums", () => {
  expect(sources.length).toBeGreaterThanOrEqual(15)
  expect(new Set(sources.map(source => source.id)).size).toBe(sources.length)
  for (const source of sources) {
    expect(source.source).toMatch(/^https:\/\//)
    expect(source.asset).toMatch(/^\/company-logos\/\d+-[a-f0-9]{12}\.(png|ico|svg)$/)
    const bytes = readFileSync(`public${source.asset}`)
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(source.sha256)
    expect(bytes.length).toBe(source.bytes)
    expect(bytes.length).toBeLessThan(100_000)
    if (source.asset.endsWith(".svg")) expect(bytes.toString()).not.toMatch(/<script|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|\/\/|data:)|<!ENTITY/i)
    expect(companyLogo(source)).toBe(source.asset)
    expect(companyLogo({ ...source, name: "不同公司" })).toBeNull()
  }
  expect(companyLogo({ id: "unknown", name: sources[0].name })).toBeNull()
})
