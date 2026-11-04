"use client"

import Link from "next/link"
import { useEffect, useMemo, useReducer, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { CheckCircle2, Loader2, ShieldCheck, History, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { submitReviewData } from "@/lib/data/reviews"
import { z } from "zod"

import { FullscreenQuestionnaire } from "@/components/questionnaire/fullscreen-questionnaire"
import { ScorePicker } from "@/components/rating/score-picker"
import { COMPANY_SCORE_DIMENSIONS } from "@/lib/company-score-dimensions"
import { submitCompanyCommunitySubmission } from "@/lib/data/companies"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { WebButton } from "@/components/ui/web-button"
import { Textarea } from "@/components/ui/textarea"
import { findSimilarCompanies } from "@/lib/company-dedupe"
import { validateCompanySubmission } from "@/lib/content-guard"
import { buildQuestionnaireSession } from "@/lib/questionnaire/question-bank"
import { searchCompanies, getCompany } from "@/lib/api/companies"
import { useAuth } from "@/lib/auth-context"
import { withNext } from "@/lib/navigation"
import { ratingDraftScore } from "@/lib/rating-navigation"
import type { Company, CompanyListItem } from "@/lib/types"
import { cn } from "@/lib/utils"

const relations = ["在职员工", "离职员工", "面试者", "实习生", "外包 / 派遣"] as const
const paceValues = ["very_fast", "fast", "stable", "very_stable"] as const
const managementValues = ["flexible", "balanced_process", "process_clear", "process_heavy"] as const
const growthValues = ["very_fast", "team_dependent", "average", "limited"] as const
const collaborationValues = ["cross_team", "within_team", "individual", "high_friction"] as const
const overtimeValues = ["very_high", "high", "normal", "low"] as const
const promiseValues = ["mostly_kept", "partially_kept", "often_changed", "unknown"] as const

const reviewSchema = z.object({
  companyId: z.string().optional(),
  companyName: z.string().trim().min(2, "请填写公司名称"),
  relation: z.enum(relations),
  role: z.string().trim().min(2, "请填写岗位").max(120),
  baseCity: z.string().trim().max(120).optional(),
  departmentId: z.string().optional(),
  departmentHint: z.string().max(60, "部门名称不能超过 60 字").optional(),
  title: z.string().trim().min(6, "标题至少 6 个字").max(80, "标题最多 80 字"),
  content: z.string().trim().min(30, "评价至少 30 个字，避免过短结论").max(3000, "评价最多 3000 字"),
  salaryRange: z.string().optional(),
  directionScore: z.number().min(0).max(10),
  payWorth: z.number().int().min(1).max(5).optional(),
  growthRating: z.number().int().min(1).max(5).optional(),
  leaderRating: z.number().int().min(1).max(5).optional(),
  overtimeTruth: z.number().int().min(1).max(5).optional(),
  promiseDelivery: z.number().int().min(1).max(5).optional(),
  interviewDifficulty: z.number().min(0).max(10).optional(),
  salaryScore: z.number().min(0).max(10).optional(),
  growthScore: z.number().min(0).max(10).optional(),
  workLifeBalanceScore: z.number().min(0).max(10).optional(),
  managementClarityScore: z.number().min(0).max(10).optional(),
  collaborationScore: z.number().min(0).max(10).optional(),
  stabilityScore: z.number().min(0).max(10).optional(),
  integrityScore: z.number().min(0).max(10).optional(),
  interviewExperienceScore: z.number().min(0).max(10).optional(),
  canteenScore: z.number().min(0).max(10).optional(),
  officeEnvironmentScore: z.number().min(0).max(10).optional(),
  restroomScore: z.number().min(0).max(10).optional(),
  afternoonTeaScore: z.number().min(0).max(10).optional(),
  workstationComfortScore: z.number().min(0).max(10).optional(),
  commuteConvenienceScore: z.number().min(0).max(10).optional(),
  officeEquipmentScore: z.number().min(0).max(10).optional(),
  overallOfficeExperienceScore: z.number().min(0).max(10).optional(),
  companyPace: z.enum(paceValues).optional(),
  managementStyle: z.enum(managementValues).optional(),
  growthExperience: z.enum(growthValues).optional(),
  collaborationStyle: z.enum(collaborationValues).optional(),
  overtimeLevel: z.enum(overtimeValues).optional(),
  promiseKeeping: z.enum(promiseValues).optional(),
  safetyChecked: z.boolean().refine(Boolean, "请确认匿名安全检查"),
})

type ReviewForm = z.infer<typeof reviewSchema>

// A draft may contain incomplete strings. Still allowlist keys/types, cap sizes,
// and never restore the user's required safety confirmation.
const draftSchema = reviewSchema.omit({ safetyChecked: true }).partial().extend({
  companyName: z.string().max(200).optional(),
  role: z.string().max(120).optional(),
  title: z.string().max(80).optional(),
  content: z.string().max(3000).optional(),
})

const steps = [
  { title: "选择公司" },
  { title: "评分" },
  { title: "评价内容" },
]

type NewCompanyDraft = {
  companyName: string
  registeredAddress: string
  legalRepresentative: string
  city: string
  industry: string
  unifiedSocialCreditCode: string
  shortName?: string
  businessStatus?: string
  foundedDate?: string
  note?: string
  size?: string
  website?: string
  financingStage?: string
}

type CompanySelectionState = {
  query: string
  selectedCompany: Company | CompanyListItem | null
  addedCompanies: Company[]
  mode: "searching" | "selected" | "adding"
  newCompanyDraft: NewCompanyDraft
  feedback?: string
}

type CompanySelectionAction =
  | { type: "INPUT_CHANGED"; value: string }
  | { type: "SELECT_EXISTING_COMPANY"; company: Company | CompanyListItem }
  | { type: "START_ADD_COMPANY" }
  | { type: "UPDATE_NEW_COMPANY_DRAFT"; patch: Partial<NewCompanyDraft> }
  | { type: "SAVE_NEW_COMPANY"; company: Company }
  | { type: "CANCEL_ADD_COMPANY" }
  | { type: "CLEAR_SELECTION" }

function createInitialCompanySelection(): CompanySelectionState {
  return {
    query: "",
    selectedCompany: null,
    addedCompanies: [],
    mode: "searching",
    newCompanyDraft: {
      companyName: "",
      unifiedSocialCreditCode: "",
      registeredAddress: "",
      legalRepresentative: "",
      city: "",
      industry: "",
      shortName: "",
      size: "",
      website: "",
      financingStage: "",
      businessStatus: "",
      foundedDate: "",
      note: "",
    },
    feedback: undefined,
  }
}

function companySelectionReducer(state: CompanySelectionState, action: CompanySelectionAction): CompanySelectionState {
  switch (action.type) {
    case "INPUT_CHANGED": {
      const nextValue = action.value
      const keepSelected = state.selectedCompany && nextValue.trim() === state.selectedCompany.name
      return {
        ...state,
        query: nextValue,
        selectedCompany: keepSelected ? state.selectedCompany : null,
        mode: keepSelected ? "selected" : "searching",
        feedback: undefined,
      }
    }
    case "SELECT_EXISTING_COMPANY":
      return {
        ...state,
        selectedCompany: action.company,
        query: action.company.name,
        mode: "selected",
        feedback: undefined,
      }
    case "START_ADD_COMPANY":
      return {
        ...state,
        mode: "adding",
        selectedCompany: null,
        newCompanyDraft: {
          ...state.newCompanyDraft,
          companyName: state.query.trim() || state.newCompanyDraft.companyName,
        },
      }
    case "UPDATE_NEW_COMPANY_DRAFT":
      return {
        ...state,
        newCompanyDraft: { ...state.newCompanyDraft, ...action.patch },
      }
    case "SAVE_NEW_COMPANY":
      return {
        ...state,
        addedCompanies: [action.company, ...state.addedCompanies],
        selectedCompany: action.company,
        query: action.company.name,
        mode: "selected",
        feedback: "已提交公司信息，等待审核",
        newCompanyDraft: {
          companyName: "",
          unifiedSocialCreditCode: "",
          registeredAddress: "",
          legalRepresentative: "",
          city: "",
          industry: "",
          shortName: "",
          size: "",
          website: "",
          financingStage: "",
          businessStatus: "",
          foundedDate: "",
          note: "",
        },
      }
    case "CANCEL_ADD_COMPANY":
      return { ...state, mode: "searching", selectedCompany: null }
    case "CLEAR_SELECTION":
      return { ...state, selectedCompany: null, query: "", mode: "searching", feedback: undefined }
    default:
      return state
  }
}

function WebCardNoResult({ query, onAdd, dataTestId }: { query: string; onAdd: () => void; dataTestId?: string }) {
  return (
    <Card className="web-surface web-surface-base border border-border/60" data-testid={dataTestId}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">还没有这家公司</CardTitle>
        <CardDescription>你可以提交公司注册信息，审核通过后开放评价。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">当前输入：{query || "未命名公司"}</p>
        <WebButton type="button" size="sm" onClick={onAdd} data-testid="add-company-button">
          添加未收录公司
        </WebButton>
      </CardContent>
    </Card>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? <span className="text-xs font-medium text-destructive">{message}</span> : null
}

export default function SubmitReviewPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const nextPath = `/submit/review${query ? `?${query}` : ""}`

  useEffect(() => {
    if (!loading && !user) {
      router.replace(withNext("/login", nextPath))
    }
  }, [loading, nextPath, router, user])

  if (loading || !user) {
    return (
      <section
        className="mx-auto flex min-h-[60vh] w-full max-w-section items-center justify-center px-4 py-10"
        data-testid="submit-auth-gate"
      >
        <div className="flex items-center gap-3 rounded-2xl border bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
          {loading ? "正在确认登录状态…" : "正在前往登录…"}
        </div>
      </section>
    )
  }

  return <SubmitReviewForm key={user.id} />
}

function SubmitReviewForm() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(0)
  const [success, setSuccess] = useState(false)
  // submitReviewData's submitting state lives in a separate
  // state pair (not the RHF isSubmitting) so the loading UI
  // doesn't flicker between form-level and api-level phases.
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [companySelection, dispatchCompanySelection] = useReducer(companySelectionReducer, undefined, createInitialCompanySelection)
  const [questionnaireDone, setQuestionnaireDone] = useState(false)
  const [companySaving, setCompanySaving] = useState(false)
  const companySaveInFlight = useRef(false)
  const stepHeadingRef = useRef<HTMLDivElement>(null)
  const initializedCompany = useRef<string | null>(null)
  const [companySubmissionErrors, setCompanySubmissionErrors] = useState<Record<string, string>>({})
  const [allowDuplicateSubmission, setAllowDuplicateSubmission] = useState(false)
  const addCompanyModeInitializedRef = useRef(false)
  const [questionnaireSession] = useState<ReturnType<typeof buildQuestionnaireSession> | null>(() =>
    buildQuestionnaireSession({
      includeOfficeExperience: true,
      includeCBTIQuestions: true,
      maxQuestions: 12,
      focusGroups: ["work_style", "management", "growth"],
    })
  )
  // API search state
  const [searchResults, setSearchResults] = useState<CompanyListItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])
  const {
    control,
    register,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      companyId: "",
      companyName: "",
      role: "",
      baseCity: "",
      departmentId: "",
      departmentHint: "",
      title: "",
      content: "",
      salaryRange: "",
      ...(ratingDraftScore(searchParams.get("directionScore")) !== null ? { directionScore: ratingDraftScore(searchParams.get("directionScore"))! } : {}),
      safetyChecked: false,
    },
  })

  const watched = useWatch({ control })
  const progress = Math.round((step / steps.length) * 100)
  const openFromQuery = searchParams.get("questionnaire") === "1"
  const addCompanyMode = searchParams.get("mode") === "add-company"
  const onboardingMode = searchParams.get("onboarding") === "1"
  const addCompanyName = searchParams.get("name") ?? ""
  const preselectCompanyId = searchParams.get("companyId") ?? ""
  const selectedCompanyId = companySelection.selectedCompany?.id

  useEffect(() => {
    if (!selectedCompanyId) return
    let active = true
    fetch(`/api/companies/${selectedCompanyId}/departments`)
      .then((response) => response.json())
      .then((result: { departments?: Array<{ id: string; name: string }> }) => {
        if (active) setDepartments(result.departments ?? [])
      })
      .catch(() => {
        if (active) setDepartments([])
      })
    return () => {
      active = false
    }
  }, [selectedCompanyId])
  const allCompanies = useMemo(() => [...searchResults, ...companySelection.addedCompanies], [searchResults, companySelection.addedCompanies])
  const normalizedCompanyQuery = companySelection.query.trim().toLowerCase()
  const matchedCompanies = useMemo(() => {
    if (!normalizedCompanyQuery) return []
    return allCompanies.filter((company) => {
      const aliases = [
        company.name,
        (company as Company).registeredName ?? (company as CompanyListItem).shortName ?? "",
        (company as Company).englishName ?? "",
        (company as CompanyListItem).aliases ?? [],
      ]
        .flat()
        .filter((v): v is string => typeof v === "string")
        .map((s) => s.toLowerCase())
      return aliases.some((alias) => alias.includes(normalizedCompanyQuery))
    })
  }, [allCompanies, normalizedCompanyQuery])
  const similarCompanies = useMemo(
    () =>
      companySelection.mode === "adding"
        ? findSimilarCompanies(
            {
              name: companySelection.newCompanyDraft.companyName,
              registeredName: companySelection.newCompanyDraft.companyName,
              unifiedSocialCreditCode: companySelection.newCompanyDraft.unifiedSocialCreditCode,
              city: companySelection.newCompanyDraft.city,
              industry: companySelection.newCompanyDraft.industry,
            },
            companySelection.addedCompanies
          )
        : [],
    [companySelection.mode, companySelection.newCompanyDraft, companySelection.addedCompanies]
  )
  const shouldShowNoResult =
    normalizedCompanyQuery.length >= 2 &&
    !searchLoading && !searchError && matchedCompanies.length === 0 &&
    companySelection.selectedCompany === null &&
    companySelection.mode === "searching"
  const selectedCompanyReviewable =
    companySelection.selectedCompany?.reviewStatus === "reviewable"
  const canContinueCompanyStep = companySelection.selectedCompany !== null && selectedCompanyReviewable

  // ─── Draft auto-save (SOTA form craft) ──────────────────────────
  // Users in 2026 expect: if I close the tab, the next visit
  // offers to restore what I'd typed. We save to localStorage on
  // a 1s debounce; on mount, if a draft exists and is younger
  // than 7 days, we surface a 'restore?' prompt instead of
  // silently overwriting. The prompt dismisses if the user
  // starts typing.
  const DRAFT_KEY = `zaichang:review-draft:v2:${user!.id}`
  const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
  const [draftAvailable, setDraftAvailable] = useState<null | { savedAt: number; values: Partial<ReviewForm> }>(null)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)

  // On mount: look for a stored draft and offer to restore
  useEffect(() => {
    if (typeof window === "undefined") return
    if (onboardingMode) return
    // Defer setState via macrotask to satisfy react-hooks/set-state-in-effect
    const handle = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(DRAFT_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw) as { savedAt: number; values: Partial<ReviewForm> }
        const values = draftSchema.safeParse(parsed.values)
        if (!values.success || !Number.isFinite(parsed.savedAt) || parsed.savedAt > Date.now()) return
        if (preselectCompanyId && values.data.companyId !== preselectCompanyId) return
        if (Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
          window.localStorage.removeItem(DRAFT_KEY)
          return
        }
        // Don't prompt if the user already typed something (means
        // a previous session restored successfully and they're back)
        if (watched.companyName) return
        setDraftAvailable({ savedAt: parsed.savedAt, values: values.data })
      } catch {}
    }, 0)
    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingMode, DRAFT_KEY, preselectCompanyId])

  // On every form change, debounce a write
  useEffect(() => {
    if (typeof window === "undefined" || !isDirty || success || draftAvailable) return
    // Don't persist the fully-empty default state — that would
    // pollute the slot and re-prompt on every visit. The form
    // schema is flat (no nested scores object), so we probe a
    // couple of the user-typed fields.
    const isEmpty =
      !watched.companyName &&
      !watched.role &&
      !watched.content &&
      !watched.title
    if (isEmpty) return
    const handle = window.setTimeout(() => {
      try {
        const savedAt = Date.now()
        window.localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ savedAt, values: { ...watched, safetyChecked: undefined } })
        )
        setDraftSavedAt(savedAt)
        setDraftAvailable(null) // user has typed, dismiss any pending prompt
      } catch {}
    }, 1000)
    return () => window.clearTimeout(handle)
  }, [watched, isDirty, success, draftAvailable, DRAFT_KEY])

  async function restoreDraft() {
    if (!draftAvailable) return
    const draft = draftAvailable.values
    if (!draft.companyId) { toast.error("草稿未选择公司，请重新选择"); return }
    const result = await getCompany(draft.companyId)
    if (result.error || !result.data?.company) { toast.error("公司信息暂时不可用，草稿仍保留"); return }
    if (result.data.company.reviewStatus !== "reviewable") { toast.error("公司尚未开放评价"); return }
    Object.entries(draft).forEach(([key, value]) => {
      if (value !== undefined && key !== "safetyChecked") setValue(key as keyof ReviewForm, value as never, { shouldDirty: true })
    })
    selectCompany(result.data.company)
    setValue("safetyChecked", false)
    setDraftAvailable(null)
    toast.success("草稿已恢复")
  }

  function discardDraft() {
    try {
      window.localStorage.removeItem(DRAFT_KEY)
    } catch {}
    setDraftAvailable(null)
  }
  const completion = Math.round((step / steps.length) * 100)

  useEffect(() => {
    if (addCompanyMode && !addCompanyModeInitializedRef.current) {
      if (addCompanyName) {
        dispatchCompanySelection({ type: "INPUT_CHANGED", value: addCompanyName })
        dispatchCompanySelection({ type: "UPDATE_NEW_COMPANY_DRAFT", patch: { companyName: addCompanyName } })
      } else {
        dispatchCompanySelection({ type: "CLEAR_SELECTION" })
      }
      dispatchCompanySelection({ type: "START_ADD_COMPANY" })
      addCompanyModeInitializedRef.current = true
    }
    if (!addCompanyMode && addCompanyModeInitializedRef.current) {
      addCompanyModeInitializedRef.current = false
    }
  }, [addCompanyMode, addCompanyName])

  // Debounce keystrokes and cancel stale requests; selecting a company is not a new search.
  useEffect(() => {
    const controller = new AbortController()
    if (!normalizedCompanyQuery || companySelection.selectedCompany) return
    const timer = window.setTimeout(() => {
      setSearchLoading(true)
      searchCompanies({ q: normalizedCompanyQuery }, controller.signal).then(result => {
        if (controller.signal.aborted) return
        setSearchResults(result.data?.companies ?? [])
        setSearchError(result.error)
        setSearchLoading(false)
      })
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [normalizedCompanyQuery, companySelection.selectedCompany])

  useEffect(() => {
    if (!preselectCompanyId || addCompanyMode || initializedCompany.current === preselectCompanyId) return
    const controller = new AbortController()
    getCompany(preselectCompanyId, controller.signal).then(result => {
      if (controller.signal.aborted) return
      initializedCompany.current = preselectCompanyId
      if (result.error || !result.data?.company) { setSearchError("预选公司加载失败，请搜索重试"); return }
      setValue("companyId", result.data.company.id)
      setValue("companyName", result.data.company.name)
      dispatchCompanySelection({ type: "SELECT_EXISTING_COMPANY", company: result.data.company })
    })
    return () => controller.abort()
  }, [preselectCompanyId, addCompanyMode, setValue])

  useEffect(() => { if (step > 0) stepHeadingRef.current?.focus() }, [step])

  function setQuestionnaireOpen(open: boolean) {
    const params = new URLSearchParams(searchParams.toString())
    if (open) params.set("questionnaire", "1")
    else params.delete("questionnaire")
    // Same-page UI state: preserve form, company and browser Back without a document/RSC request.
    const url = `/submit/review${params.size ? "?" + params : ""}`
    if (open) window.history.pushState(null, "", url)
    else window.history.replaceState(null, "", url)
  }

  async function nextStep() {
    if (step === 0) {
      if (!companySelection.selectedCompany) {
        return
      }
      setValue("companyId", companySelection.selectedCompany.id, { shouldDirty: true, shouldValidate: true })
      setValue("companyName", companySelection.selectedCompany.name, { shouldDirty: true, shouldValidate: true })
    }
    if (!await trigger(step === 0 ? ["companyId", "companyName", "role", "relation"] : ["directionScore"], { shouldFocus: true })) return
    setStep((current) => Math.min(current + 1, steps.length - 1))
  }

  async function onSubmit(values: ReviewForm) {
    if (
      !companySelection.selectedCompany ||
      companySelection.selectedCompany.reviewStatus !== "reviewable"
    ) {
      toast.error("公司信息审核通过后才可以发布评价")
      return
    }
    setSubmitError(null)
    setSubmitting(true)
    try {
      // Map the form's Chinese-labelled values into the API's
      // English authorRole enum. relation is the form's
      // "在职员工 / 离职员工 / ..." choice; the API expects
      // current_employee / former_employee / etc.
      const roleMap: Record<string, string> = {
        在职员工: "current_employee",
        离职员工: "former_employee",
        面试者: "interviewee",
        实习生: "intern",
        "外包 / 派遣": "contractor",
      }
      const result = await submitReviewData({
        companyId: companySelection.selectedCompany.id,
        authorRole: roleMap[values.relation] ?? "anonymous",
        title: values.title,
        content: values.content,
        directionScore: values.directionScore,
        recommendToJoin: values.directionScore >= 7,
        jobTitle: values.role,
        departmentId: values.departmentId || undefined,
        departmentHint: values.departmentId ? undefined : values.departmentHint,
        city: values.baseCity || companySelection.selectedCompany.city,
        employmentStatus: values.relation,
        ratingDimensions: {
          pay_worth: values.payWorth,
          growth: values.growthRating,
          leader: values.leaderRating,
          overtime_truth: values.overtimeTruth,
          promise_delivery: values.promiseDelivery,
        },
        officeExperienceScore: values.overallOfficeExperienceScore,
        questionnaire: {
          interviewDifficulty: values.interviewDifficulty,
          interviewExperienceScore: values.interviewExperienceScore,
          salaryRange: values.salaryRange || undefined,
          overallOfficeExperienceScore: values.overallOfficeExperienceScore,
          salaryScore: values.salaryScore,
          growthScore: values.growthScore,
          workLifeBalanceScore: values.workLifeBalanceScore,
          managementClarityScore: values.managementClarityScore,
          collaborationScore: values.collaborationScore,
          stabilityScore: values.stabilityScore,
          integrityScore: values.integrityScore,
          canteenScore: values.canteenScore,
          officeEnvironmentScore: values.officeEnvironmentScore,
          restroomScore: values.restroomScore,
          afternoonTeaScore: values.afternoonTeaScore,
          workstationComfortScore: values.workstationComfortScore,
          commuteConvenienceScore: values.commuteConvenienceScore,
          officeEquipmentScore: values.officeEquipmentScore,
          companyPace: values.companyPace,
          managementStyle: values.managementStyle,
          growthExperience: values.growthExperience,
          collaborationStyle: values.collaborationStyle,
          overtimeLevel: values.overtimeLevel,
          promiseKeeping: values.promiseKeeping,
        },
      })
      if (!result.ok) {
        setSubmitError(result.error)
        toast.error(result.error)
        return
      }
      try { window.localStorage.removeItem(DRAFT_KEY) } catch {}
      setSuccess(true)
      toast.success(result.message)
    } finally {
      setSubmitting(false)
    }
  }

  function selectCompany(company: Company | CompanyListItem) {
    setSearchLoading(false)
    setSearchError(null)
    setDepartments([])
    if (companySelection.selectedCompany?.id !== company.id) { setValue("departmentId", ""); setValue("departmentHint", "") }
    setValue("companyId", company.id, { shouldDirty: true })
    setValue("companyName", company.name, { shouldDirty: true, shouldValidate: true })
    dispatchCompanySelection({ type: "SELECT_EXISTING_COMPANY", company })
  }

  function openAddCompany() {
    dispatchCompanySelection({ type: "START_ADD_COMPANY" })
  }

  async function saveCompanyAndContinue(continueToReview = false) {
    if (companySaveInFlight.current) return
    const newCompanyDraft = companySelection.newCompanyDraft
    const validation = validateCompanySubmission({
      companyName: newCompanyDraft.companyName,
      unifiedSocialCreditCode: newCompanyDraft.unifiedSocialCreditCode,
      registeredAddress: newCompanyDraft.registeredAddress,
      legalRepresentative: newCompanyDraft.legalRepresentative,
      city: newCompanyDraft.city,
      industry: newCompanyDraft.industry,
      note: newCompanyDraft.note,
    })
    setCompanySubmissionErrors(validation.errors)
    if (!validation.ok) {
      toast.error(Object.values(validation.errors)[0] ?? "请检查公司注册信息")
      return
    }
    if (similarCompanies.length > 0 && !allowDuplicateSubmission) {
      toast.error("请先确认疑似重复公司")
      return
    }
    companySaveInFlight.current = true
    setCompanySaving(true)
    try {
      const result = await submitCompanyCommunitySubmission({
        ...newCompanyDraft,
        registeredName: newCompanyDraft.companyName.trim(),
      })
      if (!result.ok) { setCompanySubmissionErrors(result.details ?? {}); toast.error(result.error); return }
      dispatchCompanySelection({ type: "SAVE_NEW_COMPANY", company: result.company })
      setValue("companyId", result.company.id, { shouldDirty: true })
      setValue("companyName", result.company.name, { shouldDirty: true })
      toast.success("公司信息已提交，审核通过后开放评价")
      if (continueToReview) router.replace("/submit/review", { scroll: false })
    } finally { companySaveInFlight.current = false; setCompanySaving(false) }
  }

  function updateNewCompanyDraft(patch: Partial<NewCompanyDraft>) {
    setCompanySubmissionErrors({})
    setAllowDuplicateSubmission(false)
    const nextPatch = patch.unifiedSocialCreditCode
      ? { ...patch, unifiedSocialCreditCode: patch.unifiedSocialCreditCode.toUpperCase() }
      : patch
    dispatchCompanySelection({ type: "UPDATE_NEW_COMPANY_DRAFT", patch: nextPatch })
  }

  if (success) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Card className="web-surface web-surface-base border border-border/60" data-testid="submit-review-success">
          <CardHeader>
            <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <CheckCircle2 />
            </div>
            <CardTitle className="text-2xl">评价已提交</CardTitle>
            <CardDescription>
              审核通过后公开展示。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <WebButton asChild><Link href="/me">我的评价</Link></WebButton>
            <WebButton asChild variant="secondary"><Link href="/companies">浏览公司</Link></WebButton>
          </CardContent>
        </Card>

      </section>
    )
  }

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_22rem]">
      {draftAvailable ? (
        <aside
          role="status"
          aria-live="polite"
          data-testid="review-draft-restore"
          className="col-span-full flex items-center justify-between gap-3 rounded-2xl border border-primary-surface-border bg-primary-tint px-4 py-3 text-sm"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <History className="size-4 shrink-0 text-primary-deep" />
            <p className="truncate text-foreground">
              <span className="font-semibold">上次没提交完</span>
              <span className="ml-1.5 text-muted-foreground">
                · {new Date(draftAvailable.savedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={restoreDraft}
              className="min-h-11 rounded-full bg-primary-deep px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              恢复草稿
            </button>
            <button
              type="button"
              onClick={discardDraft}
              aria-label="放弃草稿"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </aside>
      ) : null}
      <form onSubmit={handleSubmit(onSubmit, (invalid) => { setStep(invalid.role || invalid.companyName ? 0 : invalid.directionScore ? 1 : 2) })} className="flex min-w-0 flex-col gap-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {addCompanyMode ? "添加公司" : "写评价"}
            </h1>
            {draftSavedAt ? (
              <span
                aria-live="polite"
                data-testid="review-draft-saved"
                className="hidden text-xs text-muted-foreground sm:inline-flex"
              >
                已自动保存草稿 · {new Date(draftSavedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            ) : null}
          </div>
        </div>

        {!addCompanyMode ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3 text-sm lg:hidden">
            <div>
              <p className="font-medium text-foreground">第 {step + 1} 步，共 {steps.length} 步</p>
              <p className="text-muted-foreground">{steps[step].title}</p>
            </div>
            <span className="tabular-nums text-muted-foreground">{completion}%</span>
          </div>
        ) : null}

        <Card className="web-surface web-surface-base border border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div ref={stepHeadingRef} tabIndex={-1} className="outline-none"><CardTitle>{steps[step].title}</CardTitle></div>
              </div>
              <span className="text-sm text-muted-foreground">
                第 {step + 1} 步 / 共 {steps.length} 步
              </span>
            </div>
            <div className="rounded-2xl bg-muted p-2">
              <Progress data-testid="review-progress" value={progress} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn("grid gap-4", step === 0 ? "md:grid-cols-2" : "")}>
              {step === 0 ? (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="companyName">搜索公司 *</Label>
                    <Controller
                      control={control}
                      name="companyName"
                      render={({ field }) => (
                        <Input
                          id="companyName"
                          data-testid="company-search-input"
                          value={companySelection.query}
                          onChange={(event) => {
                            setSearchResults([])
                            setSearchError(null)
                            setSearchLoading(Boolean(event.target.value.trim()) && event.target.value !== companySelection.selectedCompany?.name)
                            dispatchCompanySelection({ type: "INPUT_CHANGED", value: event.target.value })
                            field.onChange(event)
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          aria-invalid={Boolean(errors.companyName)}
                          placeholder="输入公司名称"
                          className="rounded-[18px] border-border/60 bg-card shadow-[0_3px_0_rgba(17,24,39,0.035)]"
                        />
                      )}
                    />
                    {errors.companyName ? <p className="text-sm text-destructive">{errors.companyName.message}</p> : null}
                    <div className="mt-2 space-y-2">
                      {searchLoading ? (
                        <p className="text-sm text-muted-foreground">搜索中...</p>
                      ) : searchError ? (
                        <p className="text-sm text-destructive">搜索失败，请稍后重试</p>
                      ) : matchedCompanies.slice(0, 4).map((company) => (
                        <WebButton
                          key={company.id}
                          data-testid="company-result-option"
                          type="button"
                          variant={companySelection.selectedCompany?.id === company.id ? "dark" : "secondary"}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => selectCompany(company)}
                        >
                          <span>{company.name}</span>
                          <span>{company.industry}</span>
                          <span>{company.city}</span>
                        </WebButton>
                      ))}
                    </div>
                    {shouldShowNoResult ? <WebCardNoResult query={companySelection.query} onAdd={openAddCompany} dataTestId="no-company-result-card" /> : null}
                    {companySelection.selectedCompany ? (
                      <div data-testid="selected-company-pill" className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl bg-muted p-3 text-sm text-foreground">
                        <span>{companySelection.selectedCompany.name}</span>
                        <span>{companySelection.selectedCompany.city}</span>
                        <span>{companySelection.selectedCompany.industry}</span>
                        {companySelection.selectedCompany.reviewStatus === "pending_review" ? (
                          <span className="text-xs text-muted-foreground">当前状态：待审核</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {!addCompanyMode ? <div className="flex flex-col gap-2">
                    <Label htmlFor="role">岗位 *</Label>
                    <Controller
                      control={control}
                      name="role"
                      render={({ field }) => (
                        <Input
                          id="role"
                          placeholder="例如：前端工程师"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          aria-invalid={Boolean(errors.role)}
                          className="rounded-[18px] border-border/60 bg-card shadow-[0_3px_0_rgba(17,24,39,0.035)]"
                        />
                      )}
                    />
                    {errors.role ? <p className="text-sm text-destructive">{errors.role.message}</p> : null}
                  </div> : null}
                  {!addCompanyMode ? <div className="flex flex-col gap-2">
                    <Label htmlFor="baseCity">工作城市（选填）</Label>
                    <Input id="baseCity" placeholder="例如：上海" {...register("baseCity")} />
                  </div> : null}
                  {companySelection.mode === "adding" ? (
                    <Card className="md:col-span-2 web-surface web-surface-base border border-border/60">
                      <CardHeader>
                        <CardTitle>添加未收录公司</CardTitle>
                        <CardDescription>
                          提交公司注册信息，审核通过后开放评价。
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-3 md:grid-cols-2">
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          公司名称 *
                          <Input data-testid="new-company-name-input" value={companySelection.newCompanyDraft.companyName} onChange={(event) => updateNewCompanyDraft({ companyName: event.target.value })} placeholder="完整公司名称" className="rounded-[18px] border-border/60 bg-card shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                          <FieldError message={companySubmissionErrors.companyName} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          统一社会信用代码 *
                          <Input data-testid="new-company-credit-code-input" value={companySelection.newCompanyDraft.unifiedSocialCreditCode} onChange={(event) => updateNewCompanyDraft({ unifiedSocialCreditCode: event.target.value })} placeholder="例如：91310000XXXXXXXXXX" className="rounded-[18px] border-border/60 bg-card shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                          <FieldError message={companySubmissionErrors.unifiedSocialCreditCode} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          注册地址 *
                          <Input data-testid="new-company-address-input" value={companySelection.newCompanyDraft.registeredAddress} onChange={(event) => updateNewCompanyDraft({ registeredAddress: event.target.value })} placeholder="公司注册登记地址" className="rounded-[18px] border-border/60 bg-card shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                          <FieldError message={companySubmissionErrors.registeredAddress} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          法定代表人 *
                          <Input data-testid="new-company-legal-representative-input" value={companySelection.newCompanyDraft.legalRepresentative} onChange={(event) => updateNewCompanyDraft({ legalRepresentative: event.target.value })} placeholder="法定代表人姓名" className="rounded-[18px] border-border/60 bg-card shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                          <FieldError message={companySubmissionErrors.legalRepresentative} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          注册城市 *
                          <Input data-testid="new-company-city-input" value={companySelection.newCompanyDraft.city} onChange={(event) => updateNewCompanyDraft({ city: event.target.value })} placeholder="注册城市" className="rounded-[18px] border-border/60 bg-card shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                          <FieldError message={companySubmissionErrors.city} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          所属行业 *
                          <Input data-testid="new-company-industry-input" value={companySelection.newCompanyDraft.industry} onChange={(event) => updateNewCompanyDraft({ industry: event.target.value })} placeholder="所属行业" className="rounded-[18px] border-border/60 bg-card shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                          <FieldError message={companySubmissionErrors.industry} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          公司简称
                          <Input data-testid="new-company-short-name-input" value={companySelection.newCompanyDraft.shortName ?? ""} onChange={(event) => updateNewCompanyDraft({ shortName: event.target.value })} placeholder="可选" className="rounded-[18px] border-border/60 bg-card shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          公司规模
                          <Input data-testid="new-company-size-input" value={companySelection.newCompanyDraft.size ?? ""} onChange={(event) => updateNewCompanyDraft({ size: event.target.value })} placeholder="可选" className="rounded-[18px] border-border/60 bg-card shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          融资阶段
                          <Input data-testid="new-company-financing-input" value={companySelection.newCompanyDraft.financingStage ?? ""} onChange={(event) => updateNewCompanyDraft({ financingStage: event.target.value })} placeholder="可选" className="rounded-[18px] border-border/60 bg-card shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          经营状态
                          <Input data-testid="new-company-business-status-input" value={companySelection.newCompanyDraft.businessStatus ?? ""} onChange={(event) => updateNewCompanyDraft({ businessStatus: event.target.value })} placeholder="可选，例如：存续" className="rounded-[18px] border-border/60 bg-card shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          成立时间
                          <Input data-testid="new-company-founded-date-input" value={companySelection.newCompanyDraft.foundedDate ?? ""} onChange={(event) => updateNewCompanyDraft({ foundedDate: event.target.value })} placeholder="可选，例如：2020-01-01" className="rounded-[18px] border-border/60 bg-card shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground md:col-span-2">
                          官网
                          <Input data-testid="new-company-website-input" value={companySelection.newCompanyDraft.website ?? ""} onChange={(event) => updateNewCompanyDraft({ website: event.target.value })} placeholder="可选" className="rounded-[18px] border-border/60 bg-card shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground md:col-span-2">
                          备注
                          <Textarea data-testid="new-company-note-input" value={companySelection.newCompanyDraft.note ?? ""} onChange={(event) => updateNewCompanyDraft({ note: event.target.value })} placeholder="可选，补充信息来源或需要核对的地方。" />
                          <FieldError message={companySubmissionErrors.note} />
                        </label>
                        {similarCompanies.length > 0 ? (
                          <div className="md:col-span-2 rounded-3xl bg-risk-surface p-4" data-testid="similar-company-warning">
                            <p className="text-sm font-semibold text-destructive">可能已经收录这些公司</p>
                            <div className="mt-3 grid gap-2">
                              {similarCompanies.slice(0, 3).map(({ company, reasons }) => (
                                <div key={company.id} className="flex flex-col gap-2 rounded-2xl bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">{company.name}</p>
                                    <p className="flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                                      <span>{company.city}</span>
                                      <span>{company.industry}</span>
                                      <span>{company.reviewStatus === "reviewable" ? "可评价" : "待审核"}</span>
                                      <span>{reasons.join(" / ")}</span>
                                    </p>
                                  </div>
                                  <WebButton
                                    type="button"
                                    variant="dark"
                                    size="sm"
                                    onClick={() => {
                                      selectCompany(company)
                                      router.replace("/submit/review", { scroll: false })
                                    }}
                                  >
                                    选择这家公司
                                  </WebButton>
                                </div>
                              ))}
                            </div>
                            <WebButton type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setAllowDuplicateSubmission(true)}>
                              仍然提交新公司
                            </WebButton>
                            {allowDuplicateSubmission ? <p className="mt-2 text-xs text-destructive">已确认继续提交新公司。</p> : null}
                          </div>
                        ) : null}
                        <p className="md:col-span-2 rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
                          公司资料审核通过后开放评价，不授予企业修改用户评价的权限。
                        </p>
                      </CardContent>
                      <CardFooter className="gap-2">
                        <WebButton
                          type="button"
                          variant="primary"
                          disabled={companySaving}
                          onClick={() => saveCompanyAndContinue(true)}
                          data-testid="save-company-and-continue-button"
                        >
                          {companySaving ? "提交中…" : "提交公司资料"}
                        </WebButton>
                        <WebButton
                          type="button"
                          variant="secondary"
                          disabled={companySaving}
                          onClick={() => saveCompanyAndContinue(false)}
                        >
                          只提交公司
                        </WebButton>
                        <WebButton type="button" variant="ghost" onClick={() => dispatchCompanySelection({ type: "CANCEL_ADD_COMPANY" })}>
                          取消
                        </WebButton>
                      </CardFooter>
                    </Card>
                  ) : null}
                  {companySelection.selectedCompany?.reviewStatus === "pending_review" ? (
                    <Card className="md:col-span-2 web-surface web-surface-base border border-border/60" data-testid="company-pending-review-card">
                      <CardHeader>
                        <CardTitle>公司信息已提交审核</CardTitle>
                        <CardDescription>公司资料正在等待审核</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p>当前状态：待审核</p>
                        <p>公司审核通过后才能提交评价。</p>
                      </CardContent>
                      <CardFooter className="gap-2">
                        <WebButton
                          type="button"
                          variant="primary"
                          onClick={() => router.replace("/submit/review?onboarding=1", { scroll: false })}
                        >
                          返回评价流程
                        </WebButton>
                        <WebButton type="button" variant="secondary" onClick={() => dispatchCompanySelection({ type: "CLEAR_SELECTION" })}>
                          继续了解其他公司
                        </WebButton>
                      </CardFooter>
                    </Card>
                  ) : null}
                  {companySelection.feedback ? <p className="md:col-span-2 text-sm font-medium text-primary-deep">{companySelection.feedback}</p> : null}
                  {!addCompanyMode ? <div className="flex flex-col gap-2 md:col-span-2">
                    <Label>身份关系 *</Label>
                    <Controller
                      control={control}
                      name="relation"
                      render={({ field }) => (
                        <div className="flex flex-wrap gap-2">
                          {relations.map((relation) => (
                            <WebButton
                              key={relation}
                              type="button"
                              variant={field.value === relation ? "dark" : "secondary"}
                              size="sm"
                              aria-pressed={field.value === relation}
                              onClick={() => field.onChange(relation)}
                            >
                              {relation}
                            </WebButton>
                          ))}
                        </div>
                      )}
                    />
                    {errors.relation ? <p className="text-sm text-destructive">请选择你与公司的关系</p> : null}
                  </div> : null}
                </>
              ) : null}

              {step === 1 ? (
                <>
                  <Controller
                    control={control}
                    name="directionScore"
                    render={({ field }) => (
                      <ScorePicker label="方向分" value={field.value} onChange={field.onChange} />
                    )}
                  />
                  {errors.directionScore ? <p role="alert" className="text-sm text-destructive">请选择方向分后继续</p> : null}
                  <section aria-label="多维评价" className="space-y-4">
                    <div><h2 className="text-lg font-semibold">多维评价</h2><p className="mt-1 text-sm text-muted-foreground">只评你了解的部分，未回答不会计为 0 分。</p></div>
                    {COMPANY_SCORE_DIMENSIONS.map(({ key, label }) => <Controller key={key} control={control} name={key} render={({ field }) => <ScorePicker label={label} value={field.value} onChange={field.onChange} optional />} />)}
                    <WebButton type="button" variant="secondary" onClick={() => setQuestionnaireOpen(true)}>补充工作方式与办公体验</WebButton>
                  </section>
                  <details className="rounded-lg border border-border p-4">
                  <summary className="min-h-11 cursor-pointer text-sm font-semibold">补充分项评分（选填）</summary>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="departmentId">部门</Label>
                      <select
                        id="departmentId"
                        {...register("departmentId")}
                        className="h-11 w-full border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring"
                      >
                        <option value="">找不到 / 暂不公开</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="departmentHint">部门申报</Label>
                      <Input
                        id="departmentHint"
                        placeholder="例如：商业化平台"
                        {...register("departmentHint")}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {([
                      ["payWorth", "薪酬值得"],
                      ["growthRating", "成长空间"],
                      ["leaderRating", "直属领导"],
                      ["overtimeTruth", "加班真实度"],
                      ["promiseDelivery", "承诺兑现"],
                    ] as const).map(([name, label]) => (
                      <Controller
                        key={name}
                        control={control}
                        name={name}
                        render={({ field }) => (
                          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                            {label}
                            <select
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
                              className="h-11 border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring"
                            >
                              <option value="">跳过</option>
                              {[1, 2, 3, 4, 5].map((score) => (
                                <option key={score} value={score}>
                                  {score} / 5
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      />
                    ))}
                  </div>
                  <label className="flex flex-col gap-2 text-sm font-medium">面试难度
                    <select className="min-h-11 border border-input bg-card px-3" {...register("interviewDifficulty", { setValueAs: (value: string) => value === "" ? undefined : Number(value) })}>
                      <option value="">跳过</option>
                      {Array.from({ length: 11 }, (_, score) => <option key={score} value={score}>{score} / 10</option>)}
                    </select>
                  </label>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="salaryRange">薪资区间，可跳过</Label>
                    <Input id="salaryRange" placeholder="例如：25k-35k x 14" {...register("salaryRange")} />
                  </div>
                  </details>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="title">标题 *</Label>
                    <Controller
                      control={control}
                      name="title"
                      render={({ field }) => (
                        <Input
                          data-testid="review-title-input"
                          id="title"
                          placeholder="例如：节奏快，但工程氛围比较稳定"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          aria-invalid={Boolean(errors.title)}
                        />
                      )}
                    />
                    {errors.title ? <p className="text-sm text-destructive">{errors.title.message}</p> : null}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="content">评价内容 *</Label>
                    <Controller
                      control={control}
                      name="content"
                      render={({ field }) => (
                        <Textarea
                          data-testid="review-content-input"
                          id="content"
                          rows={7}
                          placeholder="写下管理方式、工作负荷、成长机会、薪资兑现、面试体验等。"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          aria-invalid={Boolean(errors.content)}
                        />
                      )}
                    />
                    {errors.content ? <p className="text-sm text-destructive">{errors.content.message}</p> : null}
                  </div>
                  <Controller
                    control={control}
                    name="safetyChecked"
                    render={({ field }) => (
                      <button
                        data-testid="anonymous-safety-checkbox"
                        type="button"
                        aria-pressed={field.value}
                        onClick={() => {
                          field.onChange(!field.value)
                          setValue("safetyChecked", !field.value)
                        }}
                        className={cn(
                          "flex items-start gap-3 rounded-2xl border p-4 text-left text-sm transition-colors",
                          field.value ? "border-primary bg-primary/10" : "bg-background"
                        )}
                      >
                        <ShieldCheck className="mt-0.5 shrink-0" />
                        <span>
                          <span className="block font-medium">匿名安全检查 *</span>
                          <span className="mt-1 block text-muted-foreground">
                            我确认没有写入姓名、工号、手机号、具体团队小群、住址等可识别信息。
                          </span>
                        </span>
                      </button>
                    )}
                  />
                  {errors.safetyChecked ? <p className="text-sm text-destructive">{errors.safetyChecked.message}</p> : null}
                </>
              ) : null}
            </div>
          </CardContent>
          {!addCompanyMode ? <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <WebButton
              type="button"
              variant="secondary"
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(current - 1, 0))}
            >
              上一步
            </WebButton>
            {step < steps.length - 1 ? (
              <WebButton
                type="button"
                data-testid={step === 0 ? "company-step-next-button" : "review-next"}
                onClick={nextStep}
                disabled={step === 0 && !canContinueCompanyStep}
              >
                下一步
              </WebButton>
            ) : (
              <div className="flex w-full flex-col items-end gap-2">
                {submitError ? (
                  <p
                    role="alert"
                    className="rounded-xl bg-destructive-bright/10 px-4 py-2 text-sm text-destructive-bright"
                  >
                    {submitError}
                  </p>
                ) : null}
                <WebButton
                  data-testid="submit-review-button"
                  type="submit"
                  disabled={isSubmitting || submitting}
                >
                  {isSubmitting || submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      提交中…
                    </>
                  ) : (
                    "发布匿名评价"
                  )}
                </WebButton>
              </div>
            )}
          </CardFooter> : null}
        </Card>

        {!addCompanyMode ? <Card className="border border-border/60" data-testid="optional-questionnaire">
          <CardHeader>
            <CardTitle>工作方式与办公体验</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <WebButton type="button" size="sm" data-testid="start-questionnaire-button" onClick={() => setQuestionnaireOpen(true)}>
              补充问卷
            </WebButton>
            {questionnaireDone ? (
              <p className="flex flex-wrap gap-x-2.5 gap-y-1 text-sm font-medium text-primary-deep">
                <span>问卷已填入草稿，随评价一起提交</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">可选，不影响评价提交</p>
            )}
            <span data-testid="questionnaire-open-flag" className="sr-only">
              {openFromQuery ? "open" : "closed"}
            </span>
          </CardContent>
        </Card> : null}
      </form>

      {!openFromQuery && !addCompanyMode ? (
      <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>发布状态</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="bg-muted p-4">
              <p className="text-sm text-muted-foreground">流程进度</p>
              <p className="mt-1 text-3xl font-semibold">{completion}%</p>
            </div>
            <div className="rounded-xl border p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 />
                当前步骤：{steps[step].title}
              </div>
              <p className="mt-2 text-muted-foreground">
                提交后会进入匿名审核，审核期间仅你自己可见。
              </p>
            </div>
          </CardContent>
        </Card>
      </aside>
      ) : null}

      <FullscreenQuestionnaire
        open={openFromQuery}
        session={questionnaireSession}
        values={watched}
        onClose={() => setQuestionnaireOpen(false)}
        onChange={(questionnaire) => {
          Object.entries(questionnaire).forEach(([key, value]) => { setValue(key as keyof ReviewForm, value as never, { shouldDirty: true }) })
        }}
        onComplete={({ questionnaire }) => {
          Object.entries(questionnaire).forEach(([key, value]) => {
            if (typeof value !== "undefined") {
              setValue(key as keyof ReviewForm, value as never)
            }
          })
          setQuestionnaireDone(true)

        }}
      />
    </section>
  )
}
