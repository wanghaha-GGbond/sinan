/**
 * M3 P1 服务层纯函数(无 DB 依赖,可单元测试)
 *
 * 这里集中放:
 *   - 高光馆:moderation 状态机(纯函数,不查 DB)
 *   - 一技封神:endorse 升级阈值判定
 *   - 感谢信:12 小时封顶判定
 *
 * 设计原则:
 *   - 纯函数优先,DB 查询放路由层 (Drizzle 直接调用)
 *
 * 注: M4 探索期(积分竞猜 / 雇主体检报告 / 可视化公司)整块暂不 ship
 *     — 需要 PIA + 法务前置。代码在 feat/track-c-p1-and-m4 worktree 保留
 *     待法务过线后再 cherry-pick。
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
