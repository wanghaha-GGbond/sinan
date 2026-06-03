"use client"

/**
 * Local-only persistence for review reports. Real production would POST
 * to /api/moderation/review-discussions, but for the prototype we just
 * keep the report in localStorage so the user sees their action confirmed
 * and we don't surface "report" again on the same review.
 */

const STORAGE_KEY = "sinan_review_reports"

export const REPORT_REASONS = [
  { id: "personal_attack", label: "人身攻击 / 辱骂" },
  { id: "privacy", label: "泄露个人隐私或商业秘密" },
  { id: "rumor", label: "恶意造谣 / 与事实明显不符" },
  { id: "mob", label: "煽动网暴 / 群体对立" },
  { id: "leader_dox", label: "公开领导姓名 / 联系方式" },
  { id: "ai_spam", label: "AI 批量垃圾内容" },
  { id: "competitor", label: "竞品恶意刷评" },
  { id: "company_astro", label: "公司控评 / 水军" },
  { id: "duplicate", label: "重复内容" },
  { id: "other", label: "其它(自由填写)" },
] as const

export type ReportReasonId = (typeof REPORT_REASONS)[number]["id"]

export type ReviewReport = {
  reviewId: string
  reason: ReportReasonId
  note?: string
  createdAt: string
}

function readAll(): ReviewReport[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(reports: ReviewReport[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
}

export function getReportForReview(reviewId: string): ReviewReport | null {
  return readAll().find((report) => report.reviewId === reviewId) ?? null
}

export function hasReported(reviewId: string): boolean {
  return getReportForReview(reviewId) !== null
}

export function submitReport(input: {
  reviewId: string
  reason: ReportReasonId
  note?: string
}): ReviewReport {
  const report: ReviewReport = {
    reviewId: input.reviewId,
    reason: input.reason,
    note: input.note?.trim() || undefined,
    createdAt: new Date().toISOString(),
  }
  const existing = readAll().filter((r) => r.reviewId !== report.reviewId)
  writeAll([...existing, report])
  return report
}

export function getReportCountForReview(reviewId: string): number {
  return readAll().filter((r) => r.reviewId === reviewId).length
}
