/**
 * Local-only persistence for the iOS prototype. Mirrors the API surface of
 * `apps/web/src/lib/*-storage.ts` so call sites stay identical across both
 * platforms.
 *
 * Backed by `@react-native-async-storage/async-storage` when available, and
 * silently falls back to an in-memory Map when the package is not yet
 * installed (so the prototype still boots during setup).
 */

type StorageLike = {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

let memCache: Map<string, string> | null = null
let realStorage: StorageLike | null = null

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@react-native-async-storage/async-storage")
  realStorage = (mod?.default ?? mod) as StorageLike
} catch {
  // Module not installed — fall back to in-memory storage for the session.
  memCache = new Map<string, string>()
}

const storage: StorageLike = realStorage ?? {
  async getItem(key) {
    return memCache?.get(key) ?? null
  },
  async setItem(key, value) {
    memCache?.set(key, value)
  },
  async removeItem(key) {
    memCache?.delete(key)
  },
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await storage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  try {
    await storage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore — prototype best-effort
  }
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ── Useful reviews (helpful vote) ────────────────────────────────────────

const USEFUL_KEY = "sinan_useful_reviews"

export async function isReviewUsefulAsync(reviewId: string): Promise<boolean> {
  const ids = await readJson<string[]>(USEFUL_KEY, [])
  return ids.includes(reviewId)
}

export async function toggleReviewUsefulAsync(reviewId: string): Promise<boolean> {
  const ids = await readJson<string[]>(USEFUL_KEY, [])
  if (ids.includes(reviewId)) {
    const next = ids.filter((id) => id !== reviewId)
    await writeJson(USEFUL_KEY, next)
    return false
  }
  await writeJson(USEFUL_KEY, [...ids, reviewId])
  return true
}

// ── Favorite companies ──────────────────────────────────────────────────

const FAV_KEY = "sinan_favorite_companies"

export async function isCompanyFavoritedAsync(companyId: string): Promise<boolean> {
  const ids = await readJson<string[]>(FAV_KEY, [])
  return ids.includes(companyId)
}

export async function toggleCompanyFavoriteAsync(companyId: string): Promise<boolean> {
  const ids = await readJson<string[]>(FAV_KEY, [])
  if (ids.includes(companyId)) {
    await writeJson(FAV_KEY, ids.filter((id) => id !== companyId))
    return false
  }
  await writeJson(FAV_KEY, [...ids, companyId])
  return true
}

export async function getFavoritedCompanyIdsAsync(): Promise<string[]> {
  return readJson<string[]>(FAV_KEY, [])
}

// ── Review reports ──────────────────────────────────────────────────────

const REPORT_KEY = "sinan_review_reports"

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

export async function getReportForReviewAsync(reviewId: string): Promise<ReviewReport | null> {
  const reports = await readJson<ReviewReport[]>(REPORT_KEY, [])
  return reports.find((r) => r.reviewId === reviewId) ?? null
}

export async function submitReportAsync(input: {
  reviewId: string
  reason: ReportReasonId
  note?: string
}): Promise<ReviewReport> {
  const report: ReviewReport = {
    reviewId: input.reviewId,
    reason: input.reason,
    note: input.note?.trim() || undefined,
    createdAt: new Date().toISOString(),
  }
  const existing = await readJson<ReviewReport[]>(REPORT_KEY, [])
  await writeJson(REPORT_KEY, [...existing.filter((r) => r.reviewId !== report.reviewId), report])
  return report
}

// ── Company portal submissions ──────────────────────────────────────────

const CORRECTION_KEY = "sinan_company_corrections"
const APPEAL_KEY = "sinan_company_appeals"

export const CORRECTION_FIELDS = [
  { value: "name", label: "公司名称", description: "工商注册名 / 常用名" },
  { value: "registeredName", label: "注册名", description: "营业执照上的全称" },
  { value: "industry", label: "行业", description: "主营行业分类" },
  { value: "city", label: "总部城市", description: "工商注册城市" },
  { value: "size", label: "公司规模", description: "员工人数区间" },
  { value: "stage", label: "融资阶段", description: "最新一轮" },
  { value: "description", label: "公司一句话介绍", description: "面向求职者的简介" },
  { value: "website", label: "公司官网", description: "招聘/介绍页" },
  { value: "other", label: "其它", description: "在说明里写清楚" },
] as const

export type CorrectionFieldId = (typeof CORRECTION_FIELDS)[number]["value"]

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

export type CompanyCorrection = {
  id: string
  companyId: string
  field: CorrectionFieldId
  currentValue: string
  proposedValue: string
  reason: string
  status: "submitted" | "reviewing" | "approved" | "rejected"
  createdAt: string
}

export type CompanyAppeal = {
  id: string
  companyId: string
  reviewId: string
  reason: AppealReasonId
  note: string
  status: "submitted" | "reviewing" | "upheld" | "rejected"
  createdAt: string
}

export async function listCorrectionsAsync(companyId: string): Promise<CompanyCorrection[]> {
  const all = await readJson<CompanyCorrection[]>(CORRECTION_KEY, [])
  return all.filter((c) => c.companyId === companyId)
}

export async function submitCorrectionAsync(
  input: Omit<CompanyCorrection, "id" | "status" | "createdAt">
): Promise<CompanyCorrection> {
  const next: CompanyCorrection = {
    ...input,
    id: newId("correction"),
    status: "submitted",
    createdAt: new Date().toISOString(),
  }
  const all = await readJson<CompanyCorrection[]>(CORRECTION_KEY, [])
  await writeJson(CORRECTION_KEY, [next, ...all])
  return next
}

export async function listAppealsAsync(companyId: string): Promise<CompanyAppeal[]> {
  const all = await readJson<CompanyAppeal[]>(APPEAL_KEY, [])
  return all.filter((a) => a.companyId === companyId)
}

export async function listAppealsForReviewAsync(reviewId: string): Promise<CompanyAppeal[]> {
  const all = await readJson<CompanyAppeal[]>(APPEAL_KEY, [])
  return all.filter((a) => a.reviewId === reviewId)
}

export async function submitAppealAsync(
  input: Omit<CompanyAppeal, "id" | "status" | "createdAt">
): Promise<CompanyAppeal> {
  const next: CompanyAppeal = {
    ...input,
    id: newId("appeal"),
    status: "submitted",
    createdAt: new Date().toISOString(),
  }
  const all = await readJson<CompanyAppeal[]>(APPEAL_KEY, [])
  await writeJson(APPEAL_KEY, [next, ...all])
  return next
}

// ── Review discussions (追问 / 补充) ───────────────────────────────────

const DISCUSSION_KEY = "sinan_review_discussions"

export type DiscussionType = "追问" | "补充"
export type DiscussionStatus = "visible" | "limited_visible" | "pending_review" | "rejected" | "hidden"

export type ReviewDiscussion = {
  id: string
  reviewId: string
  companyId: string
  type: DiscussionType
  authorLabel: string
  authorRole: "job_seeker" | "current_employee" | "former_employee" | "interviewee" | "intern" | "contractor" | "anonymous"
  content: string
  usefulCount: number
  status: DiscussionStatus
  isUsefulByCurrentUser?: boolean
  createdAt: string
}

export async function listDiscussionsForReviewAsync(reviewId: string): Promise<ReviewDiscussion[]> {
  const all = await readJson<ReviewDiscussion[]>(DISCUSSION_KEY, [])
  return all.filter((d) => d.reviewId === reviewId)
}

export async function listMyDiscussionsAsync(): Promise<ReviewDiscussion[]> {
  // For now: any discussion authored by the current user would be persisted
  // with a marker; in the prototype we just return all of them sorted by date.
  const all = await readJson<ReviewDiscussion[]>(DISCUSSION_KEY, [])
  return all
}

export async function isDiscussionUsefulByMeAsync(discussionId: string): Promise<boolean> {
  const all = await readJson<ReviewDiscussion[]>(DISCUSSION_KEY, [])
  return all.find((d) => d.id === discussionId)?.isUsefulByCurrentUser ?? false
}

export async function submitDiscussionAsync(
  input: Omit<ReviewDiscussion, "id" | "usefulCount" | "status" | "isUsefulByCurrentUser" | "createdAt">
): Promise<ReviewDiscussion> {
  const next: ReviewDiscussion = {
    ...input,
    id: newId("disc"),
    usefulCount: 0,
    status: "pending_review",
    isUsefulByCurrentUser: false,
    createdAt: new Date().toISOString(),
  }
  const all = await readJson<ReviewDiscussion[]>(DISCUSSION_KEY, [])
  await writeJson(DISCUSSION_KEY, [next, ...all])
  return next
}

export async function toggleDiscussionUsefulAsync(discussionId: string): Promise<boolean> {
  const all = await readJson<ReviewDiscussion[]>(DISCUSSION_KEY, [])
  let nextValue = false
  const updated = all.map((d) => {
    if (d.id !== discussionId) return d
    if (d.isUsefulByCurrentUser) {
      nextValue = false
      return { ...d, isUsefulByCurrentUser: false, usefulCount: Math.max(0, d.usefulCount - 1) }
    }
    nextValue = true
    return { ...d, isUsefulByCurrentUser: true, usefulCount: d.usefulCount + 1 }
  })
  await writeJson(DISCUSSION_KEY, updated)
  return nextValue
}
