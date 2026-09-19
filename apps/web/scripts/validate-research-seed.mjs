import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { ZodError } from "zod"

import { formatZodIssues, parseResearchSeed } from "./research-seed-schema.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")
const inputPath = path.resolve(
  appRoot,
  process.argv[2] ?? "src/db/seeds/research-companies.json"
)

try {
  const raw = JSON.parse(await readFile(inputPath, "utf8"))
  const seed = parseResearchSeed(raw)
  const eventCount = seed.companies.reduce((total, company) => total + company.events.length, 0)
  const sentimentCount = seed.companies.reduce(
    (total, company) => total + company.sentiment.length,
    0
  )

  console.log(
    [
      "Research seed is valid.",
      `Companies: ${seed.companies.length}`,
      `Sentiment points: ${sentimentCount}`,
      `Events: ${eventCount}`,
    ].join("\n")
  )
} catch (error) {
  if (error instanceof SyntaxError) {
    console.error(`Invalid JSON in ${path.relative(appRoot, inputPath)}: ${error.message}`)
    process.exit(1)
  }

  if (error instanceof ZodError) {
    console.error(`Research seed validation failed: ${path.relative(appRoot, inputPath)}`)
    console.error(formatZodIssues(error).join("\n"))
    process.exit(1)
  }

  throw error
}
