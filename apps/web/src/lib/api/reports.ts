/**
 * Review reports — server-backed persistence.
 *
 * The previous localStorage-only implementation was a prototype shortcut;
 * reports now POST to /api/reviews/:id/reports and the moderator queue
 * reads from /api/moderation/review-reports. This module keeps the
 * surface area (`submitReport`, `getReportForReview`, `hasReported`,
 * `getReportCountForReview`) so call sites don't need to change.
 *
 * Anonymous visitors must pass a `fingerprint` so the server can create
 * a stable anonymous profile for dedup. Logged-in users can omit it.
 */

import type { ApiResponse } from "./types"

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
  id: string
  reviewId: string
  reason: ReportReasonId
  note?: string
  status: "open" | "reviewing" | "actioned" | "dismissed"
  createdAt: string
}

type ServerReportPayload = {
  id: string
  reviewId?: string
  reason: ReportReasonId
  status: ReviewReport["status"]
  createdAt: string
  alreadyReported?: boolean
}

// ---------------------------------------------------------------------------
// Fingerprint helper — for anonymous dedup. Stable per browser; nothing
// PII leaves the device.
// ---------------------------------------------------------------------------

function getFingerprint(): string | null {
  if (typeof window === "undefined") return null
  try {
    let fp = window.localStorage.getItem("sinan_anon_fingerprint")
    if (!fp) {
      const bytes = new Uint8Array(16)
      if (typeof window.crypto?.getRandomValues === "function") {
        window.crypto.getRandomValues(bytes)
      } else {
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
      }
      fp = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
      window.localStorage.setItem("sinan_anon_fingerprint", fp)
    }
    return fp
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Local cache — small per-page map so already-reported state survives a
// hard refresh without a roundtrip per review. The source of truth is
// the server; cache is best-effort.
// ---------------------------------------------------------------------------

const CACHE_KEY = "sinan_review_reports_cache"

function readCache(): Record<string, ReviewReport> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === "object" && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function writeCache(map: Record<string, ReviewReport>) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(map))
  } catch {
    // Quota or disabled storage — silently drop the cache; server is still the truth.
  }
}

function remember(report: ReviewReport) {
  const map = readCache()
  map[report.reviewId] = report
  writeCache(map)
}

// ---------------------------------------------------------------------------
// Public API (preserves the localStorage module's signatures)
// ---------------------------------------------------------------------------

export function getReportForReview(reviewId: string): ReviewReport | null {
  return readCache()[reviewId] ?? null
}

export function hasReported(reviewId: string): boolean {
  return getReportForReview(reviewId) !== null
}

export async function submitReport(input: {
  reviewId: string
  reason: ReportReasonId
  note?: string
}): Promise<ApiResponse<ReviewReport>> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    const fingerprint = getFingerprint()
    if (fingerprint) {
      headers["x-sinan-fingerprint"] = fingerprint
    }

    const res = await fetch(
      `/api/reviews/${encodeURIComponent(input.reviewId)}/reports`,
      {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          reason: input.reason,
          note: input.note?.trim() || undefined,
        }),
      }
    )

    const json = (await res.json().catch(() => null)) as
      | ServerReportPayload
      | { error: string }
      | null

    if (!res.ok || !json || "error" in json) {
      return {
        data: null,
        loading: false,
        error:
          (json && "error" in json && json.error) || `HTTP ${res.status}`,
      }
    }

    const report: ReviewReport = {
      id: json.id,
      reviewId: input.reviewId,
      reason: json.reason,
      status: json.status,
      createdAt: json.createdAt,
    }
    remember(report)
    return { data: report, loading: false, error: null }
  } catch (e: unknown) {
    return {
      data: null,
      loading: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/**
 * Count reports against a single review — best-effort client-side
 * estimate from the cache. The real count is the moderator queue's
 * territory; this is just to know if *the current visitor* has filed.
 */
export function getReportCountForReview(reviewId: string): number {
  return hasReported(reviewId) ? 1 : 0
}
