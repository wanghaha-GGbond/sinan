import { COMPANY_SCORE_DIMENSIONS, type CompanyDimensionSummary } from "@/lib/company-score-dimensions"
import { sanitizePublicQuestionnaire } from "@/lib/review-questionnaire"

/** Call only with visible, non-deleted reviews. Missing answers never count as zero. */
export function summarizeCompanyDimensions(rows: Array<{ questionnaire: unknown }>): CompanyDimensionSummary[] {
  const questionnaires = rows.map(row => sanitizePublicQuestionnaire(row.questionnaire))
  return COMPANY_SCORE_DIMENSIONS.map(({ key }) => {
    const values = questionnaires.map(q => q?.[key]).filter((value): value is number => typeof value === "number")
    return { key, count: values.length, score: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : null }
  })
}
