import { z } from "zod"

function isRealIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

const isoDateSchema = z.string().refine(isRealIsoDate, "must be a real YYYY-MM-DD date")
const scoreSchema = z.number().min(0).max(10)
const optionalTextSchema = z.string().trim().optional()
const optionalUrlSchema = z
  .string()
  .trim()
  .url()
  .optional()
  .or(z.literal(""))
  .transform((value) => value || undefined)

const sentimentSchema = z.object({
  date: isoDateSchema,
  score: scoreSchema,
  sampleCount: z.number().int().min(0),
  components: z
    .record(z.string(), scoreSchema)
    .default({}),
})

const eventSchema = z.object({
  id: z.uuid().optional(),
  date: isoDateSchema,
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().min(1).max(20).default("其他"),
  sourceUrl: optionalUrlSchema,
})

const companySchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1),
  registeredName: optionalTextSchema,
  shortName: optionalTextSchema,
  aliases: z.array(z.string().trim().min(1)).optional(),
  englishName: optionalTextSchema,
  unifiedSocialCreditCode: optionalTextSchema,
  registeredAddress: optionalTextSchema,
  legalRepresentative: optionalTextSchema,
  businessStatus: optionalTextSchema,
  foundedDate: isoDateSchema.optional(),
  city: z.string().trim().min(1),
  industry: z.string().trim().min(1),
  size: optionalTextSchema,
  financingStage: optionalTextSchema,
  website: optionalUrlSchema,
  logoUrl: optionalUrlSchema,
  emailDomains: z.array(z.string().trim().min(1)).default([]),
  description: z.string().trim().min(20).max(800),
  departments: z.array(z.string().trim().min(1)).min(1).default([
    "研发与工程",
    "产品与设计",
    "商业化与运营",
  ]),
  sentiment: z.array(sentimentSchema).default([]),
  events: z.array(eventSchema).default([]),
})

export const researchSeedSchema = z.object({
  generatedAt: isoDateSchema.optional(),
  notes: optionalTextSchema,
  companies: z.array(companySchema).min(1),
})

export function parseResearchSeed(input) {
  return researchSeedSchema.parse(input)
}

export function formatZodIssues(error) {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "<root>"
    return `- ${path}: ${issue.message}`
  })
}
