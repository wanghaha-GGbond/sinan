/**
 * M3 P1 + M4 探索期 — 服务层纯函数(无 DB 依赖,可单元测试)
 *
 * 这里集中放:
 *   - 高光馆:moderation 状态机(纯函数,不查 DB)
 *   - 一技封神:endorse 升级阈值判定
 *   - 感谢信:12 小时封顶判定
 *   - 积分竞猜:开/平仓逻辑 + 下注校验
 *   - 雇主品牌体检报告:聚合洞察生成(纯函数,只接收聚合后的输入)
 *
 * 设计原则:
 *   - 纯函数优先,DB 查询放路由层 (Drizzle 直接调用)
 *   - 任何生成"对外展示"内容的地方,都强制 k-匿名 / 段位脱敏
 *   - 雇主报告 content 字段绝对禁止包含 reviewer 姓名 / ID / 单条 review 内容
 *     (由 sanitizeReportContent 兜底)
 */

// ---------------------------------------------------------------------------
// 高光馆
// ---------------------------------------------------------------------------

export type HighlightModerationDecision = "approved" | "rejected"

export function isValidHighlightModerationDecision(
  value: unknown
): value is HighlightModerationDecision {
  return value === "approved" || value === "rejected"
}

export const HIGHLIGHT_CONTENT_MIN = 10
export const HIGHLIGHT_CONTENT_MAX = 300

export function isValidHighlightContent(value: unknown): value is string {
  if (typeof value !== "string") return false
  const trimmed = value.trim()
  return (
    trimmed.length >= HIGHLIGHT_CONTENT_MIN &&
    trimmed.length <= HIGHLIGHT_CONTENT_MAX
  )
}

// ---------------------------------------------------------------------------
// 一技封神
// ---------------------------------------------------------------------------

export const SKILL_NAME_MAX = 40
export const SKILL_DESCRIPTION_MAX = 280
export const SKILL_EVIDENCE_MAX = 280

export const SKILL_APPROVAL_THRESHOLD = 3

export function shouldPromoteSkillToApproved(
  endorserCount: number
): boolean {
  return endorserCount >= SKILL_APPROVAL_THRESHOLD
}

export function isValidSkillPayload(payload: {
  name?: unknown
  description?: unknown
  evidenceNote?: unknown
}): payload is { name: string; description: string; evidenceNote: string } {
  return (
    typeof payload.name === "string" &&
    payload.name.trim().length > 0 &&
    payload.name.trim().length <= SKILL_NAME_MAX &&
    typeof payload.description === "string" &&
    payload.description.trim().length > 0 &&
    payload.description.trim().length <= SKILL_DESCRIPTION_MAX &&
    typeof payload.evidenceNote === "string" &&
    payload.evidenceNote.trim().length > 0 &&
    payload.evidenceNote.trim().length <= SKILL_EVIDENCE_MAX
  )
}

// ---------------------------------------------------------------------------
// 感谢信漂流
// ---------------------------------------------------------------------------

export const GRATITUDE_WINDOW_HOURS = 12
export const GRATITUDE_CONTENT_MIN = 10
export const GRATITUDE_CONTENT_MAX = 500

export function isValidGratitudeContent(value: unknown): value is string {
  if (typeof value !== "string") return false
  const trimmed = value.trim()
  return (
    trimmed.length >= GRATITUDE_CONTENT_MIN &&
    trimmed.length <= GRATITUDE_CONTENT_MAX
  )
}

export function isWithinGratitudeWindow(lastSentAt: Date | null): boolean {
  if (!lastSentAt) return false
  const windowMs = GRATITUDE_WINDOW_HOURS * 60 * 60 * 1000
  return Date.now() - lastSentAt.getTime() < windowMs
}

// ---------------------------------------------------------------------------
// 积分竞猜 (M4 — 不接真钱)
// ---------------------------------------------------------------------------

export const PREDICTION_OUTCOMES_MIN = 2
export const PREDICTION_OUTCOMES_MAX = 6
export const PREDICTION_BET_MIN = 1
export const PREDICTION_BET_MAX = 100

export const WEEKLY_POINTS_GRANT = 100

export function isValidPredictionOutcomes(value: unknown): value is string[] {
  if (!Array.isArray(value)) return false
  if (
    value.length < PREDICTION_OUTCOMES_MIN ||
    value.length > PREDICTION_OUTCOMES_MAX
  ) {
    return false
  }
  return value.every(
    (v) => typeof v === "string" && v.trim().length > 0 && v.length <= 40
  )
}

export function isOutcomeInMarket(
  outcome: unknown,
  outcomes: string[]
): outcome is string {
  if (typeof outcome !== "string") return false
  return outcomes.includes(outcome)
}

export function isValidBetAmount(value: unknown): value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) return false
  return (
    Number.isInteger(value) &&
    value >= PREDICTION_BET_MIN &&
    value <= PREDICTION_BET_MAX
  )
}

export function canAffordBet(
  pointsBalance: number,
  pointsBet: number
): boolean {
  return pointsBalance >= pointsBet && pointsBet > 0
}

// ---------------------------------------------------------------------------
// 雇主品牌体检报告 (M4 B 端探索) — 红线守门员
// ---------------------------------------------------------------------------

export const EMPLOYER_REPORT_PRICE_CENTS_MIN = 1

const FORBIDDEN_KEYS = new Set([
  "reviewerName",
  "reviewerId",
  "reviewId",
  "singleReviewContent",
  "reviewContent",
  "reviewerNickname",
  "displayName",
  "authorName",
  "rawReview",
  "reviewText",
  "content",
  "text",
  "body",
])

function isAllowedScalar(v: unknown): boolean {
  return (
    typeof v === "number" ||
    typeof v === "string" ||
    typeof v === "boolean"
  )
}

function isAllowedStructured(v: unknown): boolean {
  if (v === null) return true
  if (Array.isArray(v)) {
    return v.every(
      (item) =>
        typeof item === "number" ||
        typeof item === "string" ||
        typeof item === "boolean" ||
        isAllowedStructured(item)
    )
  }
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>).every(
      ([k, val]) => !FORBIDDEN_KEYS.has(k) && isAllowedStructured(val)
    )
  }
  return isAllowedScalar(v)
}

export function sanitizeReportContent(
  raw: unknown
): Record<string, unknown> | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null
  }
  if (!isAllowedStructured(raw)) return null
  return raw as Record<string, unknown>
}

export type AggregatedInsightInput = {
  windowDays: number
  reviewCount: number
  recommendRate: number
  avgDirectionScore: number | null
  departmentDistribution: Record<string, number>
  riskTagCloud: Record<string, number>
  trend: Array<{ date: string; count: number; recommendRate: number }>
}

export function buildAggregatedReportContent(
  input: AggregatedInsightInput
): Record<string, unknown> {
  return {
    windowDays: input.windowDays,
    reviewCount: input.reviewCount,
    recommendRate: input.recommendRate,
    avgDirectionScore: input.avgDirectionScore,
    departmentDistribution: input.departmentDistribution,
    riskTagCloud: input.riskTagCloud,
    trend: input.trend,
  }
}