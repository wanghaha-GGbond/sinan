const NUMERIC_KEYS = [
  "interviewDifficulty",
  "interviewExperienceScore",
  "salaryScore",
  "growthScore",
  "workLifeBalanceScore",
  "managementClarityScore",
  "collaborationScore",
  "stabilityScore",
  "integrityScore",
  "canteenScore",
  "officeEnvironmentScore",
  "restroomScore",
  "afternoonTeaScore",
  "workstationComfortScore",
  "commuteConvenienceScore",
  "officeEquipmentScore",
  "overallOfficeExperienceScore",
] as const

const STRING_KEYS = [
  "companyPace",
  "managementStyle",
  "growthExperience",
  "collaborationStyle",
  "overtimeLevel",
  "promiseKeeping",
] as const

const STRING_VALUES: Record<(typeof STRING_KEYS)[number], readonly string[]> = {
  companyPace: ["very_fast", "fast", "stable", "very_stable"],
  managementStyle: ["flexible", "balanced_process", "process_clear", "process_heavy"],
  growthExperience: ["very_fast", "team_dependent", "average", "limited"],
  collaborationStyle: ["cross_team", "within_team", "individual", "high_friction"],
  overtimeLevel: ["very_high", "high", "normal", "low"],
  promiseKeeping: ["mostly_kept", "partially_kept", "often_changed", "unknown"],
}

export type PublicReviewQuestionnaire = Record<string, number | string | string[] | null>

/** Keep the public questionnaire boundary explicit even for legacy rows. */
export function sanitizePublicQuestionnaire(input: unknown): PublicReviewQuestionnaire | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null

  const source = input as Record<string, unknown>
  const result: PublicReviewQuestionnaire = {}

  for (const key of NUMERIC_KEYS) {
    if (source[key] === null || source[key] === undefined) continue
    const value = typeof source[key] === "number" ? source[key] : Number(source[key])
    if (Number.isFinite(value) && value >= 0 && value <= 10) result[key] = value
  }

  for (const key of STRING_KEYS) {
    if (
      typeof source[key] === "string" &&
      source[key].length <= 64 &&
      STRING_VALUES[key].includes(source[key])
    ) {
      result[key] = source[key]
    }
  }

  if (Array.isArray(source.tags)) {
    const tags = source.tags
      .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
      .map((tag) => tag.trim().slice(0, 40))
      .slice(0, 8)
    if (tags.length > 0) result.tags = tags
  }

  if (source.salaryRange === null) result.salaryRange = null
  else if (typeof source.salaryRange === "string") result.salaryRange = source.salaryRange.slice(0, 120)

  return Object.keys(result).length > 0 ? result : null
}

export function extractPublicDimensionScores(input: unknown): Record<string, number> | undefined {
  const questionnaire = sanitizePublicQuestionnaire(input)
  if (!questionnaire) return undefined
  const scores = Object.fromEntries(
    NUMERIC_KEYS
      .filter((key) => typeof questionnaire[key] === "number")
      .map((key) => [key, questionnaire[key] as number]),
  )
  return Object.keys(scores).length > 0 ? scores : undefined
}
