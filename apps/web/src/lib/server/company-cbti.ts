import type { CBTIProfile } from "@/lib/types"
import { sanitizePublicQuestionnaire, type PublicReviewQuestionnaire } from "@/lib/review-questionnaire"

export const CBTI_MIN_AXIS_SAMPLES = 5
type SignalRow = { directionScore: unknown; questionnaire: unknown }

function numeric(q: PublicReviewQuestionnaire, key: string, threshold: number, positiveAbove = true) {
  const value = q[key]
  return typeof value === "number" ? (positiveAbove ? value >= threshold : value < threshold) : null
}

/** Each review contributes at most one vote per axis; missing answers contribute none.
 * No default axes or conversion of legacy five-point ratings into ten-point answers. */
export function inferPublicCBTI(rows: SignalRow[]): CBTIProfile | undefined {
  const questionnaires = rows.map(row => sanitizePublicQuestionnaire(row.questionnaire)).filter((q): q is PublicReviewQuestionnaire => q !== null)
  const axes = [
    questionnaires.map(q => typeof q.companyPace === "string" ? ["very_fast", "fast"].includes(q.companyPace) : typeof q.overtimeLevel === "string" ? ["very_high", "high"].includes(q.overtimeLevel) : numeric(q, "workLifeBalanceScore", 6.6, false)),
    questionnaires.map(q => typeof q.managementStyle === "string" ? ["process_clear", "process_heavy"].includes(q.managementStyle) : numeric(q, "managementClarityScore", 7.2)),
    questionnaires.map(q => typeof q.growthExperience === "string" ? ["very_fast", "team_dependent"].includes(q.growthExperience) : numeric(q, "growthScore", 7.4)),
    questionnaires.map(q => typeof q.collaborationStyle === "string" ? ["cross_team", "within_team"].includes(q.collaborationStyle) : numeric(q, "collaborationScore", 7)),
  ].map(votes => votes.filter((vote): vote is boolean => vote !== null))
  if (axes.some(votes => votes.length < CBTI_MIN_AXIS_SAMPLES)) return undefined
  // A tied axis is indeterminate, not evidence for the negative category.
  if (axes.some(votes => votes.filter(Boolean).length * 2 === votes.length)) return undefined
  const [fast, process, growing, collaborative] = axes.map(votes => votes.filter(Boolean).length > votes.length / 2)
  const pace = fast ? "R" : "S"
  const management = process ? "P" : "F"
  const growth = growing ? "G" : "B"
  const collaboration = collaborative ? "C" : "I"
  const code = `${pace}${management}${growth}${collaboration}`
  const sampleSize = Math.min(...axes.map(votes => votes.length))
  return {
    code,
    title: `${fast ? "快节奏" : "稳定节奏"}${process ? "流程" : "弹性"}型`,
    summary: "来自已公开评价的工作方式回答，不代表所有岗位或团队。",
    axes: { pace, management, growth, collaboration },
    // Existing API field: sample-strength heuristic, not a calibrated probability.
    confidence: Math.min(0.8, Number((0.45 + Math.min(0.35, sampleSize / 80)).toFixed(2))),
    generatedBy: "derived",
    updatedAt: new Date().toISOString().slice(0, 10),
  }
}
