import type { CBTIProfile } from "@/lib/types"
import {
  sanitizePublicQuestionnaire,
  type PublicReviewQuestionnaire,
} from "@/lib/review-questionnaire"

type PublicSignalRow = {
  directionScore: unknown
  questionnaire: unknown
}

const CBTI_SIGNAL_KEYS = new Set([
  "workLifeBalanceScore",
  "stabilityScore",
  "overtimeLevel",
  "companyPace",
  "growthScore",
  "growthExperience",
  "managementClarityScore",
  "managementStyle",
  "collaborationScore",
  "integrityScore",
  "collaborationStyle",
])

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

function majority(values: string[], predicate: (value: string) => boolean) {
  if (!values.length) return null
  const positive = values.filter(predicate).length
  // A tie is not evidence of a positive axis. Treat it as the conservative
  // side instead of allowing one vote to decide an even-sized sample.
  return positive > values.length / 2
}

function profileTitle(code: string) {
  if (code.startsWith("RF") && code.includes("G")) return "快节奏成长型"
  if (code.startsWith("SP")) return "稳定流程型"
  if (code.startsWith("SF")) return "稳定协作型"
  return "平衡协作型"
}

/**
 * Derive the public company CBTI from already-public review aggregates.
 * It intentionally reads only structured scores and never carries review
 * content or author fields into the profile.
 */
export function inferPublicCBTI(rows: PublicSignalRow[]): CBTIProfile | undefined {
  // Company work-style profiles are public aggregate claims. Require a
  // minimum k-anonymous sample before exposing one, and require structured
  // answers rather than falling back to defaults from empty questionnaires.
  if (rows.length < 5) return undefined

  const questionnaires = rows
    .map((row) => sanitizePublicQuestionnaire(row.questionnaire))
    .filter((value): value is PublicReviewQuestionnaire => {
      if (!value) return false
      return Object.keys(value).some((key) => CBTI_SIGNAL_KEYS.has(key))
    })

  if (questionnaires.length < 5) return undefined

  const workload = questionnaires
    .map((questionnaire) => numberValue(questionnaire.workLifeBalanceScore ?? questionnaire.stabilityScore))
    .filter((value): value is number => value !== null)
  const growth = questionnaires
    .map((questionnaire) => numberValue(questionnaire.growthScore))
    .filter((value): value is number => value !== null)
  const management = questionnaires
    .map((questionnaire) => numberValue(questionnaire.managementClarityScore))
    .filter((value): value is number => value !== null)
  const collaboration = questionnaires
    .map((questionnaire) => numberValue(questionnaire.collaborationScore ?? questionnaire.integrityScore))
    .filter((value): value is number => value !== null)

  const paceSignals = questionnaires
    .map((questionnaire) => questionnaire.overtimeLevel ?? questionnaire.companyPace)
    .filter((value): value is string => typeof value === "string")
  const pace = paceSignals.length
    ? majority(paceSignals, (value) => ["very_high", "high", "very_fast", "fast"].includes(value)) ? "R" : "S"
    : (average(workload) !== null && (average(workload) as number) < 6.6 ? "R" : "S")
  const managementSignals = questionnaires
    .map((questionnaire) => questionnaire.managementStyle)
    .filter((value): value is string => typeof value === "string")
  const growthSignals = questionnaires
    .map((questionnaire) => questionnaire.growthExperience)
    .filter((value): value is string => typeof value === "string")
  const collaborationSignals = questionnaires
    .map((questionnaire) => questionnaire.collaborationStyle)
    .filter((value): value is string => typeof value === "string")
  const managementAxis = managementSignals.length
    ? majority(managementSignals, (value) => ["process_clear", "process_heavy"].includes(value)) ? "P" : "F"
    : (average(management) ?? 6) >= 7.2 ? "P" : "F"
  const growthAxis = growthSignals.length
    ? majority(growthSignals, (value) => ["very_fast", "team_dependent"].includes(value)) ? "G" : "B"
    : (average(growth) ?? 6) >= 7.4 ? "G" : "B"
  const collaborationAxis = collaborationSignals.length
    ? majority(collaborationSignals, (value) => ["cross_team", "within_team"].includes(value)) ? "C" : "I"
    : (average(collaboration) ?? 6) >= 7 ? "C" : "I"
  const code = `${pace}${managementAxis}${growthAxis}${collaborationAxis}` as CBTIProfile["code"]
  const confidence = Math.min(
    0.92,
    Number((0.45 + Math.min(0.35, questionnaires.length / 80)).toFixed(2)),
  )

  return {
    code,
    title: profileTitle(code),
    summary: "基于匿名评价中的节奏、成长、管理与协作信号生成，仅用于帮助你快速理解公司工作方式。",
    axes: {
      pace: pace as "R" | "S",
      management: managementAxis as "F" | "P",
      growth: growthAxis as "G" | "B",
      collaboration: collaborationAxis as "C" | "I",
    },
    confidence,
    generatedBy: "derived",
    updatedAt: new Date().toISOString().slice(0, 10),
  }
}
