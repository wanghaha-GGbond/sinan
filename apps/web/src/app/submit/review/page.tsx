"use client"

import { useEffect, useMemo, useReducer, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { CheckCircle2, Gift, ShieldCheck } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { z } from "zod"

import { FullscreenQuestionnaire } from "@/components/questionnaire/fullscreen-questionnaire"
import { RatingSlider } from "@/components/rating/rating-slider"
import { VerifyIdentity } from "@/components/review/verify-identity"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { SolidButton } from "@/components/ui/solid-button"
import { Textarea } from "@/components/ui/textarea"
import { findSimilarCompanies } from "@/lib/company-dedupe"
import { validateCompanySubmission } from "@/lib/content-guard"
import { buildQuestionnaireSession } from "@/lib/questionnaire/question-bank"
import { searchCompanies, getCompany } from "@/lib/api/companies"
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
  companyName: z.string().min(2, "请填写公司名称"),
  relation: z.enum(relations),
  role: z.string().min(2, "请填写岗位"),
  title: z.string().min(6, "标题至少 6 个字"),
  content: z.string().min(30, "评价至少 30 个字，避免过短结论"),
  salaryRange: z.string().optional(),
  directionScore: z.number().min(0).max(10),
  interviewDifficulty: z.number().min(0).max(10),
  salaryScore: z.number().min(1).max(10).optional(),
  growthScore: z.number().min(1).max(10).optional(),
  workLifeBalanceScore: z.number().min(1).max(10).optional(),
  managementClarityScore: z.number().min(1).max(10).optional(),
  collaborationScore: z.number().min(1).max(10).optional(),
  stabilityScore: z.number().min(1).max(10).optional(),
  integrityScore: z.number().min(1).max(10).optional(),
  interviewExperienceScore: z.number().min(1).max(10).optional(),
  canteenScore: z.number().min(1).max(10).optional(),
  officeEnvironmentScore: z.number().min(1).max(10).optional(),
  restroomScore: z.number().min(1).max(10).optional(),
  afternoonTeaScore: z.number().min(1).max(10).optional(),
  workstationComfortScore: z.number().min(1).max(10).optional(),
  commuteConvenienceScore: z.number().min(1).max(10).optional(),
  officeEquipmentScore: z.number().min(1).max(10).optional(),
  overallOfficeExperienceScore: z.number().min(1).max(10).optional(),
  companyPace: z.enum(paceValues).optional(),
  managementStyle: z.enum(managementValues).optional(),
  growthExperience: z.enum(growthValues).optional(),
  collaborationStyle: z.enum(collaborationValues).optional(),
  overtimeLevel: z.enum(overtimeValues).optional(),
  promiseKeeping: z.enum(promiseValues).optional(),
  safetyChecked: z.boolean().refine(Boolean, "请确认匿名安全检查"),
})

type ReviewForm = z.infer<typeof reviewSchema>

const steps = [
  { title: "选择公司", description: "先选择公司，找不到可以直接新增" },
  { title: "方向评分", description: "给后来者一个 0-10 的方向判断" },
  { title: "真实体验", description: "写事实、写风险、先做匿名安全检查" },
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

function SolidCardNoResult({ query, onAdd, dataTestId }: { query: string; onAdd: () => void; dataTestId?: string }) {
  return (
    <Card className="solid-card-subtle border border-border/60" data-testid={dataTestId}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">还没有这家公司</CardTitle>
        <CardDescription>你可以提交公司注册信息，审核通过后开放评价。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">当前输入：{query || "未命名公司"}</p>
        <SolidButton type="button" size="sm" onClick={onAdd} data-testid="add-company-button">
          添加未收录公司
        </SolidButton>
      </CardContent>
    </Card>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? <span className="text-xs font-medium text-destructive">{message}</span> : null
}

export default function SubmitReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(0)
  const [success, setSuccess] = useState(false)
  const [companySelection, dispatchCompanySelection] = useReducer(companySelectionReducer, undefined, createInitialCompanySelection)
  const [questionnaireDone, setQuestionnaireDone] = useState(false)
  const [questionnaireReward, setQuestionnaireReward] = useState(0)
  const [companySubmissionErrors, setCompanySubmissionErrors] = useState<Record<string, string>>({})
  const [allowDuplicateSubmission, setAllowDuplicateSubmission] = useState(false)
  const addCompanyModeInitializedRef = useRef(false)
  const [questionnaireSession] = useState<ReturnType<typeof buildQuestionnaireSession> | null>(() =>
    buildQuestionnaireSession({
      includeOfficeExperience: true,
      includeCBTIQuestions: true,
      maxQuestions: 10,
      focusGroups: ["office_experience"],
    })
  )
  // API search state
  const [searchResults, setSearchResults] = useState<CompanyListItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      companyId: "",
      companyName: "",
      relation: "离职员工",
      role: "",
      title: "",
      content: "",
      salaryRange: "",
      directionScore: 7,
      interviewDifficulty: 5,
      safetyChecked: false,
    },
  })

  const watched = useWatch({ control })
  const progress = Math.round(((step + 1) / steps.length) * 100)
  const openFromQuery = searchParams.get("questionnaire") === "1"
  const addCompanyMode = searchParams.get("mode") === "add-company"
  const addCompanyName = searchParams.get("name") ?? ""
  const preselectCompanyId = searchParams.get("companyId") ?? ""
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
    matchedCompanies.length === 0 &&
    companySelection.selectedCompany === null &&
    companySelection.mode === "searching"
  const selectedCompanyReviewable = companySelection.selectedCompany?.reviewStatus !== "pending_review" && companySelection.selectedCompany?.reviewStatus !== "rejected"
  const canContinueCompanyStep = companySelection.selectedCompany !== null && selectedCompanyReviewable
  const completion = useMemo(() => {
    const fields = [
      watched.companyName,
      watched.relation,
      watched.role,
      watched.title,
      watched.content,
      watched.directionScore,
      watched.safetyChecked,
    ]
    return Math.round((fields.filter(Boolean).length / fields.length) * 100)
  }, [watched])

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

  // Search companies via API when query changes
  useEffect(() => {
    if (!normalizedCompanyQuery || normalizedCompanyQuery.length < 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset to empty on cleared query
      setSearchResults([])
      // setSearchError(null) omitted: initial state is already null
      return
    }
    let cancelled = false
    setSearchLoading(true)
    setSearchError(null)
    searchCompanies({ q: normalizedCompanyQuery })
      .then((res) => {
        if (cancelled) return
        if (res.error) {
          setSearchError(res.error)
          setSearchResults([])
        } else {
          setSearchResults(res.data?.companies ?? [])
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setSearchError(e instanceof Error ? e.message : "搜索失败")
        setSearchResults([])
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [normalizedCompanyQuery])

  // Pre-select a company when arrived from a "匿名评价" button on a company page.
  useEffect(() => {
    if (!preselectCompanyId || addCompanyMode) return
    if (companySelection.selectedCompany?.id === preselectCompanyId) return
    getCompany(preselectCompanyId)
      .then((res) => {
        if (res.error || !res.data?.company) return
        dispatchCompanySelection({ type: "SELECT_EXISTING_COMPANY", company: res.data.company })
      })
      .catch(() => {
        // silently ignore
      })
  }, [preselectCompanyId, addCompanyMode, companySelection.selectedCompany])

  function nextStep() {
    if (step === 0) {
      if (!companySelection.selectedCompany) {
        return
      }
      setValue("companyId", companySelection.selectedCompany.id, { shouldDirty: true, shouldValidate: true })
      setValue("companyName", companySelection.selectedCompany.name, { shouldDirty: true, shouldValidate: true })
    }
    setStep((current) => Math.min(current + 1, steps.length - 1))
  }

  async function onSubmit(values: ReviewForm) {
    if (!companySelection.selectedCompany || companySelection.selectedCompany.reviewStatus !== "reviewable") {
      toast.error("公司信息审核通过后才可以发布评价")
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 400))
    setSuccess(true)
    toast.success("方向已点亮，方向值 +20")
    console.info("mock review submitted", values)
  }

  function selectCompany(company: Company | CompanyListItem) {
    setValue("companyId", company.id, { shouldDirty: true })
    setValue("companyName", company.name, { shouldDirty: true, shouldValidate: true })
    dispatchCompanySelection({ type: "SELECT_EXISTING_COMPANY", company })
  }

  function openAddCompany() {
    dispatchCompanySelection({ type: "START_ADD_COMPANY" })
  }

  function saveCompanyAndContinue() {
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
    const id = `company-custom-${Date.now()}`
    const registeredName = newCompanyDraft.companyName.trim()
    const shortName = newCompanyDraft.shortName?.trim() || registeredName.slice(0, 8)
    const now = new Date().toISOString()
    const newCompany: Company = {
      id,
      claimedStatus: "unclaimed",
      name: registeredName,
      registeredName: registeredName,
      shortName,
      unifiedSocialCreditCode: newCompanyDraft.unifiedSocialCreditCode.trim(),
      registeredAddress: newCompanyDraft.registeredAddress.trim(),
      legalRepresentative: newCompanyDraft.legalRepresentative.trim(),
      businessStatus: newCompanyDraft.businessStatus?.trim() || undefined,
      foundedDate: newCompanyDraft.foundedDate?.trim() || undefined,
      city: newCompanyDraft.city.trim(),
      industry: newCompanyDraft.industry.trim(),
      size: newCompanyDraft.size?.trim() || "规模待补充",
      stage: newCompanyDraft.financingStage?.trim() || "阶段待补充",
      financingStage: newCompanyDraft.financingStage?.trim() || undefined,
      website: newCompanyDraft.website?.trim() || undefined,
      description: newCompanyDraft.note?.trim() || undefined,
      directionScore: 0,
      recommendationRate: 0,
      salaryRange: "",
      riskLevel: "待确认" as const,
      riskTags: [],
      highlights: [],
      reviewCount: 0,
      dimensions: [
        { key: "growth", label: "成长方向", score: 0, description: "项目复杂度、学习密度与导师投入" },
        { key: "management", label: "管理清晰度", score: 0, description: "目标、汇报线、绩效反馈是否稳定" },
        { key: "workload", label: "工作负荷", score: 0, description: "加班波动、排期弹性与恢复时间" },
        { key: "pay", label: "薪资兑现", score: 0, description: "薪资区间、奖金兑现与调薪透明度" },
        { key: "respect", label: "尊重与边界", score: 0, description: "沟通方式、个人边界与匿名安全感" },
      ],
      reviews: [],
      source: "user_added",
      createdByUser: true,
      pendingReview: true,
      reviewStatus: "pending_review",
      createdAt: now,
      updatedAt: now,
      trustLevel: "",
      compassBriefs: [],
      lowScoreReasons: [],
      recommendationReasons: [],
      scoreDistribution: [],
      trend: [],
      cbti: undefined,
      vibeTag: undefined,
      scoreCanteen: undefined,
      scoreOfficeEnvironment: undefined,
      scoreRestroom: undefined,
      scoreAfternoonTea: undefined,
      scoreWorkstationComfort: undefined,
      scoreCommuteConvenience: undefined,
      scoreOfficeEquipment: undefined,
      scoreOfficeExperience: undefined,
    }
    dispatchCompanySelection({ type: "SAVE_NEW_COMPANY", company: newCompany })
    setValue("companyId", newCompany.id, { shouldDirty: true, shouldValidate: true })
    setValue("companyName", newCompany.name, { shouldDirty: true, shouldValidate: true })
    toast.success("已提交公司信息，等待审核")
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
        <Card className="solid-card border border-border/60" data-testid="submit-review-success">
          <CardHeader>
            <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Gift />
            </div>
            <CardTitle className="text-2xl">评价已进入匿名预览</CardTitle>
            <CardDescription>
              你的评价会在审核后展示。正式版本会先完成匿名保护和真实性校验，再进入公开样本。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {["方向值 +20", "连续点灯 +1", "司南徽章进度 +1"].map((item) => (
              <div key={item} className="rounded-2xl bg-muted p-4 text-sm font-medium text-foreground">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="mt-6">
          <VerifyIdentity companyName={companySelection.selectedCompany?.name ?? ""} />
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_22rem]">
      <form onSubmit={handleSubmit(onSubmit)} className="flex min-w-0 flex-col gap-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{addCompanyMode ? "添加未收录公司" : "发布评价"}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {addCompanyMode ? "提交公司注册信息，审核通过后开放评价。" : "三步完成匿名评价。司南鼓励描述事实、流程和决策信息，不鼓励攻击性表达。"}
          </p>
        </div>

        {!addCompanyMode ? <Card className="solid-card-subtle border border-border/60" data-testid="optional-questionnaire">
          <CardHeader>
            <CardTitle>补充办公体验问卷</CardTitle>
            <CardDescription>约 30 秒，可跳过。每次只问一个问题。</CardDescription>
            <p className="text-xs text-muted-foreground">办公体验，可选</p>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <SolidButton asChild size="sm" data-testid="start-questionnaire-button">
              <a href="/submit/review?questionnaire=1">开始答题</a>
            </SolidButton>
            <SolidButton type="button" variant="secondary" size="sm">
              跳过
            </SolidButton>
            {questionnaireDone ? <p className="text-sm font-medium text-[#047857]">已完成办公体验问卷 · 方向值 +{questionnaireReward}</p> : null}
            <span data-testid="questionnaire-open-flag" className="sr-only">
              {openFromQuery ? "open" : "closed"}
            </span>
          </CardContent>
        </Card> : null}

        <Card className="solid-card border border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{steps[step].title}</CardTitle>
                <CardDescription>{steps[step].description}</CardDescription>
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
                            dispatchCompanySelection({ type: "INPUT_CHANGED", value: event.target.value })
                            field.onChange(event)
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          aria-invalid={Boolean(errors.companyName)}
                          placeholder="输入公司名称"
                          className="rounded-[18px] border-border/60 bg-white shadow-[0_3px_0_rgba(17,24,39,0.035)]"
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
                        <SolidButton
                          key={company.id}
                          data-testid="company-result-option"
                          type="button"
                          variant={companySelection.selectedCompany?.id === company.id ? "dark" : "secondary"}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => selectCompany(company)}
                        >
                          {company.name} · {company.industry} · {company.city}
                        </SolidButton>
                      ))}
                    </div>
                    {shouldShowNoResult ? <SolidCardNoResult query={companySelection.query} onAdd={openAddCompany} dataTestId="no-company-result-card" /> : null}
                    {companySelection.selectedCompany ? (
                      <div data-testid="selected-company-pill" className="rounded-xl bg-muted p-3 text-sm text-foreground">
                        {companySelection.selectedCompany.name} · {companySelection.selectedCompany.city} · {companySelection.selectedCompany.industry}
                        {companySelection.selectedCompany.reviewStatus === "pending_review" ? (
                          <span className="ml-2 text-xs text-muted-foreground">当前状态：待审核</span>
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
                          className="rounded-[18px] border-border/60 bg-white shadow-[0_3px_0_rgba(17,24,39,0.035)]"
                        />
                      )}
                    />
                    {errors.role ? <p className="text-sm text-destructive">{errors.role.message}</p> : null}
                  </div> : null}
                  {companySelection.mode === "adding" ? (
                    <Card className="md:col-span-2 solid-card-subtle border border-border/60">
                      <CardHeader>
                        <CardTitle>添加未收录公司</CardTitle>
                        <CardDescription>
                          请补充公司的基础注册信息，审核通过后即可评价。公司信息用于确认主体，不会创建企业账号。
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-3 md:grid-cols-2">
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          公司名称 *
                          <Input data-testid="new-company-name-input" value={companySelection.newCompanyDraft.companyName} onChange={(event) => updateNewCompanyDraft({ companyName: event.target.value })} placeholder="完整公司名称" className="rounded-[18px] border-border/60 bg-white shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                          <FieldError message={companySubmissionErrors.companyName} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          统一社会信用代码 *
                          <Input data-testid="new-company-credit-code-input" value={companySelection.newCompanyDraft.unifiedSocialCreditCode} onChange={(event) => updateNewCompanyDraft({ unifiedSocialCreditCode: event.target.value })} placeholder="例如：91310000XXXXXXXXXX" className="rounded-[18px] border-border/60 bg-white shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                          <FieldError message={companySubmissionErrors.unifiedSocialCreditCode} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          注册地址 *
                          <Input data-testid="new-company-address-input" value={companySelection.newCompanyDraft.registeredAddress} onChange={(event) => updateNewCompanyDraft({ registeredAddress: event.target.value })} placeholder="公司注册登记地址" className="rounded-[18px] border-border/60 bg-white shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                          <FieldError message={companySubmissionErrors.registeredAddress} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          法定代表人 *
                          <Input data-testid="new-company-legal-representative-input" value={companySelection.newCompanyDraft.legalRepresentative} onChange={(event) => updateNewCompanyDraft({ legalRepresentative: event.target.value })} placeholder="法定代表人姓名" className="rounded-[18px] border-border/60 bg-white shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                          <FieldError message={companySubmissionErrors.legalRepresentative} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          注册城市 *
                          <Input data-testid="new-company-city-input" value={companySelection.newCompanyDraft.city} onChange={(event) => updateNewCompanyDraft({ city: event.target.value })} placeholder="注册城市" className="rounded-[18px] border-border/60 bg-white shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                          <FieldError message={companySubmissionErrors.city} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          所属行业 *
                          <Input data-testid="new-company-industry-input" value={companySelection.newCompanyDraft.industry} onChange={(event) => updateNewCompanyDraft({ industry: event.target.value })} placeholder="所属行业" className="rounded-[18px] border-border/60 bg-white shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                          <FieldError message={companySubmissionErrors.industry} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          公司简称
                          <Input data-testid="new-company-short-name-input" value={companySelection.newCompanyDraft.shortName ?? ""} onChange={(event) => updateNewCompanyDraft({ shortName: event.target.value })} placeholder="可选" className="rounded-[18px] border-border/60 bg-white shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          公司规模
                          <Input data-testid="new-company-size-input" value={companySelection.newCompanyDraft.size ?? ""} onChange={(event) => updateNewCompanyDraft({ size: event.target.value })} placeholder="可选" className="rounded-[18px] border-border/60 bg-white shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          融资阶段
                          <Input data-testid="new-company-financing-input" value={companySelection.newCompanyDraft.financingStage ?? ""} onChange={(event) => updateNewCompanyDraft({ financingStage: event.target.value })} placeholder="可选" className="rounded-[18px] border-border/60 bg-white shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          经营状态
                          <Input data-testid="new-company-business-status-input" value={companySelection.newCompanyDraft.businessStatus ?? ""} onChange={(event) => updateNewCompanyDraft({ businessStatus: event.target.value })} placeholder="可选，例如：存续" className="rounded-[18px] border-border/60 bg-white shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground">
                          成立时间
                          <Input data-testid="new-company-founded-date-input" value={companySelection.newCompanyDraft.foundedDate ?? ""} onChange={(event) => updateNewCompanyDraft({ foundedDate: event.target.value })} placeholder="可选，例如：2020-01-01" className="rounded-[18px] border-border/60 bg-white shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-foreground md:col-span-2">
                          官网
                          <Input data-testid="new-company-website-input" value={companySelection.newCompanyDraft.website ?? ""} onChange={(event) => updateNewCompanyDraft({ website: event.target.value })} placeholder="可选" className="rounded-[18px] border-border/60 bg-white shadow-[0_3px_0_rgba(17,24,39,0.035)]" />
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
                                    <p className="text-xs text-muted-foreground">
                                      {company.city} · {company.industry} · {company.reviewStatus === "reviewable" ? "可评价" : "待审核"} · {reasons.join(" / ")}
                                    </p>
                                  </div>
                                  <SolidButton
                                    type="button"
                                    variant="dark"
                                    size="sm"
                                    onClick={() => {
                                      selectCompany(company)
                                      router.replace("/submit/review", { scroll: false })
                                    }}
                                  >
                                    选择这家公司
                                  </SolidButton>
                                </div>
                              ))}
                            </div>
                            <SolidButton type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setAllowDuplicateSubmission(true)}>
                              仍然提交新公司
                            </SolidButton>
                            {allowDuplicateSubmission ? <p className="mt-2 text-xs text-destructive">已确认继续提交新公司。</p> : null}
                          </div>
                        ) : null}
                        <p className="md:col-span-2 rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
                          企业不能通过该流程获得控评能力。审核通过前，该公司不会开放正式评价。
                        </p>
                      </CardContent>
                      <CardFooter className="gap-2">
                        <SolidButton type="button" variant="primary" onClick={saveCompanyAndContinue} data-testid="save-company-and-continue-button">
                          提交公司信息
                        </SolidButton>
                        <SolidButton type="button" variant="ghost" onClick={() => dispatchCompanySelection({ type: "CANCEL_ADD_COMPANY" })}>
                          取消
                        </SolidButton>
                      </CardFooter>
                    </Card>
                  ) : null}
                  {companySelection.selectedCompany?.reviewStatus === "pending_review" ? (
                    <Card className="md:col-span-2 solid-card-subtle border border-border/60" data-testid="company-pending-review-card">
                      <CardHeader>
                        <CardTitle>公司信息已提交审核</CardTitle>
                        <CardDescription>审核通过后即可评价</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p>当前状态：待审核</p>
                        <p>司南采用社区共建公司库。公司信息通过审核后，求职者和真实经历者可以发布匿名评价。</p>
                      </CardContent>
                      <CardFooter className="gap-2">
                        <SolidButton type="button" variant="primary" onClick={() => router.push("/")}>
                          返回推荐
                        </SolidButton>
                        <SolidButton type="button" variant="secondary" onClick={() => dispatchCompanySelection({ type: "CLEAR_SELECTION" })}>
                          继续了解其他公司
                        </SolidButton>
                      </CardFooter>
                    </Card>
                  ) : null}
                  {companySelection.feedback ? <p className="md:col-span-2 text-sm font-medium text-[#047857]">{companySelection.feedback}</p> : null}
                  {!addCompanyMode ? <div className="flex flex-col gap-2 md:col-span-2">
                    <Label>身份关系 *</Label>
                    <Controller
                      control={control}
                      name="relation"
                      render={({ field }) => (
                        <div className="flex flex-wrap gap-2">
                          {relations.map((relation) => (
                            <SolidButton
                              key={relation}
                              type="button"
                              variant={field.value === relation ? "dark" : "secondary"}
                              size="sm"
                              onClick={() => field.onChange(relation)}
                            >
                              {relation}
                            </SolidButton>
                          ))}
                        </div>
                      )}
                    />
                  </div> : null}
                </>
              ) : null}

              {step === 1 ? (
                <>
                  <Controller
                    control={control}
                    name="directionScore"
                    render={({ field }) => (
                      <RatingSlider
                        label="方向分"
                        description="结合成长、管理、负荷、薪资兑现与尊重边界给出综合判断。"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="interviewDifficulty"
                    render={({ field }) => (
                      <RatingSlider
                        label="面试难度"
                        description="0 代表轻松，10 代表高强度或流程复杂。"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="salaryRange">薪资区间，可跳过</Label>
                    <Input id="salaryRange" placeholder="例如：25k-35k x 14" {...register("salaryRange")} />
                  </div>
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
                        onClick={() => {
                          field.onChange(!field.value)
                          setValue("safetyChecked", !field.value)
                        }}
                        className={cn(
                          "flex items-start gap-3 rounded-2xl border p-4 text-left text-sm transition-colors",
                          field.value ? "border-primary bg-secondary" : "bg-background"
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
            <SolidButton
              type="button"
              variant="secondary"
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(current - 1, 0))}
            >
              上一步
            </SolidButton>
            {step < steps.length - 1 ? (
              <SolidButton
                type="button"
                data-testid={step === 0 ? "company-step-next-button" : "review-next"}
                onClick={nextStep}
                disabled={step === 0 && !canContinueCompanyStep}
              >
                下一步
              </SolidButton>
            ) : (
              <SolidButton data-testid="submit-review-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "提交中..." : "发布匿名评价"}
              </SolidButton>
            )}
          </CardFooter> : null}
        </Card>
      </form>

      {!openFromQuery && !addCompanyMode ? (
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card className="glass-panel rounded-[28px]">
          <CardHeader>
            <CardTitle>发布状态</CardTitle>
            <CardDescription>每一步只收集必要信息，避免超长问卷。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-xl bg-muted p-4">
              <p className="text-sm text-muted-foreground">完成度</p>
              <p className="mt-1 text-3xl font-semibold">{completion}%</p>
            </div>
            <div className="rounded-xl border p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 />
                当前步骤：{steps[step].title}
              </div>
              <p className="mt-2 text-muted-foreground">
                通过匿名安全检查后，评价会进入本地 mock 成功状态，不写入真实 API。
              </p>
            </div>
          </CardContent>
        </Card>
      </aside>
      ) : null}

      <FullscreenQuestionnaire
        open={openFromQuery}
        session={questionnaireSession}
        onClose={() => {
          if (openFromQuery) {
            router.replace("/submit/review", { scroll: false })
          }
        }}
        onComplete={({ questionnaire }) => {
          Object.entries(questionnaire).forEach(([key, value]) => {
            if (typeof value !== "undefined") {
              setValue(key as keyof ReviewForm, value as never)
            }
          })
          setQuestionnaireDone(true)
          setQuestionnaireReward(8)
        }}
      />
    </section>
  )
}
