import type { CompanyCard, ScoreDetail } from "./research-report"

export function researchSignals(items: CompanyCard["opportunityDetails"]) {
  return items.filter(item => item.evidenceUsable && item.signal.trim())
}

export function researchHeadline(card?: CompanyCard) {
  if (!card) return "暂无研究结论"
  return researchSignals(card.opportunityDetails)[0]?.signal
    ?? (card.departments.length ? `关注方向：${card.departments.slice(0, 3).join("、")}` : "暂无研究结论")
}

// A neutral model fallback is not an observed experience. Preserve true zero.
export function researchDisplayScore(detail: ScoreDetail) {
  return detail.evidenceCount > 0 && detail.confidence > 0
    && Number.isFinite(detail.score) && detail.score >= 0 && detail.score <= 100
    ? detail.score : null
}
