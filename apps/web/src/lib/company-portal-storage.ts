"use client"

/**
 * Persistence layer for company-side actions:
 *  - Correction requests ("公司信息修正")
 *  - Appeal requests ("对评价的违规申诉")
 *
 * Real production would POST to /api/company-portal/*. The prototype
 * stores them in localStorage so the user sees their action acknowledged
 * and the queue is visible inside the portal.
 */

const CORRECTION_KEY = "sinan_company_corrections"
const APPEAL_KEY = "sinan_company_appeals"

export type CompanyCorrectionRequest = {
  id: string
  companyId: string
  field: "name" | "registeredName" | "industry" | "city" | "size" | "stage" | "description" | "website" | "other"
  currentValue: string
  proposedValue: string
  reason: string
  status: "submitted" | "reviewing" | "approved" | "rejected"
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
  note: string
  status: "submitted" | "reviewing" | "upheld" | "rejected"
  createdAt: string
}

function readList<T>(key: string): T[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    return Array.isArray(JSON.parse(raw)) ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function writeList<T>(key: string, list: T[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(list))
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function listCorrections(companyId: string): CompanyCorrectionRequest[] {
  return readList<CompanyCorrectionRequest>(CORRECTION_KEY).filter((r) => r.companyId === companyId)
}

export function submitCorrection(
  input: Omit<CompanyCorrectionRequest, "id" | "status" | "createdAt">
): CompanyCorrectionRequest {
  const list = readList<CompanyCorrectionRequest>(CORRECTION_KEY)
  const next: CompanyCorrectionRequest = {
    ...input,
    id: newId("correction"),
    status: "submitted",
    createdAt: new Date().toISOString(),
  }
  writeList(CORRECTION_KEY, [next, ...list])
  return next
}

export function listAppeals(companyId: string): CompanyAppealRequest[] {
  return readList<CompanyAppealRequest>(APPEAL_KEY).filter((r) => r.companyId === companyId)
}

export function listAppealsForReview(reviewId: string): CompanyAppealRequest[] {
  return readList<CompanyAppealRequest>(APPEAL_KEY).filter((r) => r.reviewId === reviewId)
}

export function submitAppeal(
  input: Omit<CompanyAppealRequest, "id" | "status" | "createdAt">
): CompanyAppealRequest {
  const list = readList<CompanyAppealRequest>(APPEAL_KEY)
  const next: CompanyAppealRequest = {
    ...input,
    id: newId("appeal"),
    status: "submitted",
    createdAt: new Date().toISOString(),
  }
  writeList(APPEAL_KEY, [next, ...list])
  return next
}
