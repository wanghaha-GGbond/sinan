/**
 * Company portal — server-backed persistence.
 *
 * The previous localStorage-only implementation was a prototype shortcut;
 * submissions now POST to /api/companies/:id/corrections and
 * /api/companies/:id/reviews/:reviewId/appeals, and the "my submissions"
 * lists read from /api/me/company-corrections and
 * /api/me/company-appeals. The public surface
 * (`listCorrections`, `submitCorrection`, `listAppeals`,
 * `listAppealsForReview`, `submitAppeal`, the enum constants, and the
 * shape types) is preserved so call sites don't need structural changes
 * — they only need to await the now-async functions.
 *
 * Anonymous visitors must pass a `fingerprint` so the server can create
 * a stable anonymous profile for dedup. Logged-in users can omit it.
 */

import type { ApiResponse } from "./types"

// ---------------------------------------------------------------------------
// Enums + shapes
// ---------------------------------------------------------------------------

export type CompanyCorrectionRequest = {
  id: string
  companyId: string
  field: "name" | "registeredName" | "industry" | "city" | "size" | "stage" | "description" | "website" | "other"
  currentValue: string
  proposedValue: string
  reason?: string
  status: "submitted" | "reviewing" | "approved" | "rejected"
  moderationNote?: string | null
  actionedAt?: string | null
  createdAt: string
}

export const CORRECTION_FIELDS: { value: CompanyCorrectionRequest["field"]; label: string; description: string }[] = [
  { value: "name", label: "公司名称", description: "工商注册名 / 常用名" },
  { value: "registeredName", label: "注册名", description: "营业执照上的全称" },
  { value: "industry", label: "行业", description: "主营行业分类" },
  { value: "city", label: "总部城市", description: "工商注册城市" },
  { value: "size", label: "公司规模", description: "员工人数区间" },
  { value: "stage", label: "融资阶段", description: "最新一轮" },
  { value: "description", label: "公司一句话介绍", description: "面向求职者的简介" },
  { value: "website", label: "公司官网", description: "招聘/介绍页" },
  { value: "other", label: "其它", description: "在说明里写清楚" },
]

export const APPEAL_REASONS = [
  { id: "personal_attack", label: "人身攻击员工 / 团队" },
  { id: "dox_leader", label: "公开领导 / 员工隐私信息" },
  { id: "fake_fact", label: "明显不实陈述(可证伪)" },
  { id: "rumor", label: "未经核实的传言" },
  { id: "ai_spam", label: "AI 批量生成 / 模板内容" },
  { id: "competitor", label: "竞对恶意刷评" },
  { id: "other", label: "其它(自由填写)" },
] as const

export type AppealReasonId = (typeof APPEAL_REASONS)[number]["id"]

export type CompanyAppealRequest = {
  id: string
  companyId: string
  reviewId: string
  reason: AppealReasonId
  note?: string | null
  status: "submitted" | "reviewing" | "upheld" | "rejected"
  moderationNote?: string | null
  actionedAt?: string | null
  createdAt: string
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

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extra ?? {}),
  }
  const fingerprint = getFingerprint()
  if (fingerprint) {
    headers["x-sinan-fingerprint"] = fingerprint
  }
  return headers
}

// ---------------------------------------------------------------------------
// Local cache — best-effort snapshot so the queue survives a hard refresh.
// The source of truth is the server; cache is per-company + per-review.
// ---------------------------------------------------------------------------

const CORRECTION_CACHE_KEY = "sinan_company_corrections_cache"
const APPEAL_CACHE_KEY = "sinan_company_appeals_cache"

function readCache<T>(key: string): T[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function writeCache<T>(key: string, list: T[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // Quota or disabled storage — silently drop the cache; server is still the truth.
  }
}

function rememberCorrection(c: CompanyCorrectionRequest) {
  const list = readCache<CompanyCorrectionRequest>(CORRECTION_CACHE_KEY).filter(
    (item) => item.id !== c.id
  )
  writeCache(CORRECTION_CACHE_KEY, [c, ...list])
}

function rememberAppeal(a: CompanyAppealRequest) {
  const list = readCache<CompanyAppealRequest>(APPEAL_CACHE_KEY).filter(
    (item) => item.id !== a.id
  )
  writeCache(APPEAL_CACHE_KEY, [a, ...list])
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function listCorrections(
  companyId: string
): Promise<CompanyCorrectionRequest[]> {
  try {
    const qs = new URLSearchParams({ companyId })
    const res = await fetch(`/api/me/company-corrections?${qs.toString()}`, {
      headers: authHeaders(),
      credentials: "include",
    })
    if (!res.ok) {
      // Server unreachable / errored — fall back to the local cache so the
      // UI still shows the user's previously submitted queue.
      return readCache<CompanyCorrectionRequest>(CORRECTION_CACHE_KEY).filter(
        (item) => item.companyId === companyId
      )
    }
    const json = (await res.json()) as { corrections: CompanyCorrectionRequest[] }
    // Hydrate the cache for the offline fallback.
    writeCache(CORRECTION_CACHE_KEY, json.corrections)
    return json.corrections
  } catch {
    return readCache<CompanyCorrectionRequest>(CORRECTION_CACHE_KEY).filter(
      (item) => item.companyId === companyId
    )
  }
}

export async function submitCorrection(
  input: Omit<CompanyCorrectionRequest, "id" | "status" | "createdAt">
): Promise<ApiResponse<CompanyCorrectionRequest>> {
  try {
    const res = await fetch(
      `/api/companies/${encodeURIComponent(input.companyId)}/corrections`,
      {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({
          field: input.field,
          currentValue: input.currentValue,
          proposedValue: input.proposedValue,
          reason: input.reason?.trim() || undefined,
        }),
      }
    )
    const json = (await res.json().catch(() => null)) as
      | (CompanyCorrectionRequest & { alreadySubmitted?: boolean })
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

    const correction: CompanyCorrectionRequest = {
      id: json.id,
      companyId: input.companyId,
      field: json.field,
      currentValue: input.currentValue,
      proposedValue: json.proposedValue,
      reason: input.reason,
      status: json.status,
      createdAt: json.createdAt,
    }
    rememberCorrection(correction)
    return { data: correction, loading: false, error: null }
  } catch (e: unknown) {
    return {
      data: null,
      loading: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

export async function listAppeals(
  companyId: string
): Promise<CompanyAppealRequest[]> {
  try {
    const qs = new URLSearchParams({ companyId })
    const res = await fetch(`/api/me/company-appeals?${qs.toString()}`, {
      headers: authHeaders(),
      credentials: "include",
    })
    if (!res.ok) {
      return readCache<CompanyAppealRequest>(APPEAL_CACHE_KEY).filter(
        (item) => item.companyId === companyId
      )
    }
    const json = (await res.json()) as { appeals: CompanyAppealRequest[] }
    writeCache(APPEAL_CACHE_KEY, json.appeals)
    return json.appeals
  } catch {
    return readCache<CompanyAppealRequest>(APPEAL_CACHE_KEY).filter(
      (item) => item.companyId === companyId
    )
  }
}

export async function listAppealsForReview(
  reviewId: string
): Promise<CompanyAppealRequest[]> {
  try {
    const qs = new URLSearchParams({ reviewId })
    const res = await fetch(`/api/me/company-appeals?${qs.toString()}`, {
      headers: authHeaders(),
      credentials: "include",
    })
    if (!res.ok) {
      return readCache<CompanyAppealRequest>(APPEAL_CACHE_KEY).filter(
        (item) => item.reviewId === reviewId
      )
    }
    const json = (await res.json()) as { appeals: CompanyAppealRequest[] }
    return json.appeals
  } catch {
    return readCache<CompanyAppealRequest>(APPEAL_CACHE_KEY).filter(
      (item) => item.reviewId === reviewId
    )
  }
}

export async function submitAppeal(
  input: Omit<CompanyAppealRequest, "id" | "status" | "createdAt">
): Promise<ApiResponse<CompanyAppealRequest>> {
  try {
    const res = await fetch(
      `/api/companies/${encodeURIComponent(input.companyId)}/reviews/${encodeURIComponent(input.reviewId)}/appeals`,
      {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({
          reason: input.reason,
          note: input.note?.trim() || undefined,
        }),
      }
    )
    const json = (await res.json().catch(() => null)) as
      | CompanyAppealRequest
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

    const appeal: CompanyAppealRequest = {
      id: json.id,
      companyId: input.companyId,
      reviewId: input.reviewId,
      reason: json.reason,
      note: input.note,
      status: json.status,
      createdAt: json.createdAt,
    }
    rememberAppeal(appeal)
    return { data: appeal, loading: false, error: null }
  } catch (e: unknown) {
    return {
      data: null,
      loading: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
