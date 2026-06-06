#!/usr/bin/env node
/**
 * One-shot Tailwind inline-hex → design-token migration.
 *
 * Walks apps/web/src/\/*.tsx and replaces well-understood inline
 * hex idioms with the design tokens declared in apps/web/src/app/globals.css.
 *
 * Idempotent: running twice is a no-op (replaces already-replaced
 * tokens back to themselves via the from→to table being the same shape).
 *
 * NOT replaced (left for manual review):
 *   - text-[#0F1419], text-[#536471], text-[#F91880], text-[#1D9BF0],
 *     text-[#CFD9DE], bg-[#F7F9F9] — Twitter-style palette not aligned
 *     with the sinan green system, needs a deliberate product call
 *   - bg-[#0E8F5F], bg-[#1F2937], text-[#C76A15], bg-[#FFF1D6],
 *     text-[#FFF1D6] — risk / warning tones that need a dedicated
 *     --risk-* / --warning-* token before migrating
 *
 * After running this script:
 *   pnpm tsc --noEmit      # must stay 0
 *   pnpm lint              # must stay 0 errors
 */
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join, extname } from "node:path"

const ROOT = new URL("..", import.meta.url).pathname
const SRC = join(ROOT, "src")

/** @type {Record<string, string>} */
const MIGRATIONS = {
  // — text tokens (high confidence) —
  "text-[#111827]": "text-foreground",
  "text-[#1F2937]": "text-foreground",
  "text-[#374151]": "text-foreground",
  "text-[#6B7280]": "text-muted-foreground",
  "text-[#9CA3AF]": "text-muted-foreground",
  "text-[#19C37D]": "text-primary",
  "text-[#19c37d]": "text-primary",
  "text-[#07563A]": "text-secondary-foreground",
  "text-[#92400E]": "text-destructive",

  // — background tokens (high confidence) —
  "bg-[#F1F5EF]": "bg-muted",
  "bg-[#DFF8EC]": "bg-secondary",
  "bg-[#F9FAF7]": "bg-card",
  "bg-[#19C37D]": "bg-primary",
  "bg-[#19c37d]": "bg-primary",
  "bg-[#111827]": "bg-foreground",

  // — border tokens (high confidence) —
  "border-[#E5E7DB]": "border-border",
  "border-[#19C37D]": "border-primary",
  "border-[#19c37d]": "border-primary",

  // — focus ring tokens —
  "focus:border-[#19C37D]": "focus:border-primary",
  "focus:ring-[#DFF8EC]": "focus:ring-secondary",
  "focus:ring-[#19C37D]": "focus:ring-primary",
  "ring-[#19C37D]": "ring-primary",
  "ring-offset-[#F7F8F2]": "ring-offset-background",
}

let touchedFiles = 0
let totalReplacements = 0

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(path)
    } else {
      yield path
    }
  }
}

for await (const path of walk(SRC)) {
  if (extname(path) !== ".tsx") continue
  let source = await readFile(path, "utf-8")
  let count = 0
  for (const [from, to] of Object.entries(MIGRATIONS)) {
    let next
    while ((next = source.replace(from, to)) !== source) {
      source = next
      count++
    }
  }
  if (count > 0) {
    await writeFile(path, source)
    touchedFiles++
    totalReplacements += count
    console.log(`  ${path}  (${count})`)
  }
}

console.log(
  `\n${touchedFiles} files, ${totalReplacements} replacements`
)
