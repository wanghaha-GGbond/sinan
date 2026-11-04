/** Shared labels and keys. These are independent 0–10 answers, not converted legacy five-point ratings. */
export const COMPANY_SCORE_DIMENSIONS = [
  { key: "salaryScore", label: "薪酬回报" },
  { key: "growthScore", label: "成长空间" },
  { key: "workLifeBalanceScore", label: "工作生活平衡" },
  { key: "managementClarityScore", label: "管理清晰度" },
  { key: "collaborationScore", label: "团队协作" },
  { key: "stabilityScore", label: "工作稳定性" },
  { key: "integrityScore", label: "承诺兑现" },
] as const

export type CompanyScoreKey = typeof COMPANY_SCORE_DIMENSIONS[number]["key"]
export type CompanyDimensionSummary = { key: CompanyScoreKey; score: number | null; count: number }
