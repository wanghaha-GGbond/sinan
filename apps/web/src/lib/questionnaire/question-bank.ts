import type { ReviewQuestionnaire } from "@/lib/types"

export type QuestionnaireQuestion = {
  id: string
  group: "office_experience" | "work_style" | "management" | "growth" | "interview" | "salary"
  field: keyof ReviewQuestionnaire
  title: string
  description?: string
  type: "score_1_10" | "single_choice" | "yes_no"
  required?: boolean
  options?: {
    label: string
    value: string | number | boolean
    feedback?: string
  }[]
  weight?: number
}

export type QuestionnaireAnswerValue = number | string | boolean

export type QuestionnaireSessionAnswer = {
  questionId: string
  field: keyof ReviewQuestionnaire
  value: QuestionnaireAnswerValue
  answeredAt: string
}

export type QuestionnaireSession = {
  id: string
  companyId?: string
  questions: QuestionnaireQuestion[]
  answers: QuestionnaireSessionAnswer[]
  currentIndex: number
  completed: boolean
  startedAt: string
  completedAt?: string
}

const officeExperienceQuestions: QuestionnaireQuestion[] = [
  { id: "q-canteen", group: "office_experience", field: "canteenScore", title: "这家公司的食堂体验怎么样？", description: "包括饭菜质量、价格、排队、便利性。", type: "score_1_10" },
  { id: "q-office-env", group: "office_experience", field: "officeEnvironmentScore", title: "办公环境整体舒服吗？", description: "包括采光、空间、噪音、整洁度。", type: "score_1_10" },
  { id: "q-restroom", group: "office_experience", field: "restroomScore", title: "厕所体验怎么样？", description: "包括干净程度、数量、维护频率。", type: "score_1_10" },
  { id: "q-afternoon-tea", group: "office_experience", field: "afternoonTeaScore", title: "下午茶体验怎么样？", description: "包括频率、质量、是否稳定。", type: "score_1_10" },
  { id: "q-workstation", group: "office_experience", field: "workstationComfortScore", title: "工位坐着舒服吗？", description: "包括工位空间、椅子、桌面、私密性。", type: "score_1_10" },
  { id: "q-commute", group: "office_experience", field: "commuteConvenienceScore", title: "通勤方便吗？", description: "包括地铁、停车、园区通勤。", type: "score_1_10" },
  { id: "q-equipment", group: "office_experience", field: "officeEquipmentScore", title: "办公设备够用吗？", description: "包括电脑、显示器、会议室、网络。", type: "score_1_10" },
  { id: "q-overall-office", group: "office_experience", field: "overallOfficeExperienceScore", title: "如果只看日常办公体验，你会给几分？", description: "综合考虑环境、食堂、厕所、工位、通勤、设备。", type: "score_1_10" },
]

const cbtiSupportQuestions: QuestionnaireQuestion[] = [
  {
    id: "q-pace",
    group: "work_style",
    field: "companyPace",
    title: "这家公司日常节奏更像哪一种？",
    type: "single_choice",
    options: [
      { label: "很快，经常变化", value: "very_fast", feedback: "已记录，这是节奏信号。" },
      { label: "偏快，但能接受", value: "fast", feedback: "收到，节奏偏快。" },
      { label: "比较稳定", value: "stable", feedback: "收到，节奏较稳。" },
      { label: "很稳定，变化少", value: "very_stable", feedback: "收到，稳定信号明确。" },
    ],
  },
  {
    id: "q-management-style",
    group: "management",
    field: "managementStyle",
    title: "这家公司的管理方式更像哪一种？",
    type: "single_choice",
    options: [
      { label: "灵活，靠人推动", value: "flexible" },
      { label: "有流程，但不死板", value: "balanced_process" },
      { label: "流程明确", value: "process_clear" },
      { label: "流程繁重", value: "process_heavy" },
    ],
  },
  {
    id: "q-growth-experience",
    group: "growth",
    field: "growthExperience",
    title: "在这里成长快吗？",
    type: "single_choice",
    options: [
      { label: "成长很快", value: "very_fast" },
      { label: "有成长，但看团队", value: "team_dependent" },
      { label: "成长一般", value: "average" },
      { label: "成长空间有限", value: "limited" },
    ],
  },
  {
    id: "q-collaboration-style",
    group: "work_style",
    field: "collaborationStyle",
    title: "协作方式更像哪一种？",
    type: "single_choice",
    options: [
      { label: "跨团队协作很多", value: "cross_team" },
      { label: "团队内协作为主", value: "within_team" },
      { label: "大多独立完成", value: "individual" },
      { label: "协作成本较高", value: "high_friction" },
    ],
  },
]

export function buildQuestionnaireSession(options?: {
  companyId?: string
  focusGroups?: string[]
  maxQuestions?: number
  includeOfficeExperience?: boolean
  includeCBTIQuestions?: boolean
}): QuestionnaireSession {
  const maxQuestions = options?.maxQuestions ?? 10
  const includeOffice = options?.includeOfficeExperience ?? true
  const includeCbti = options?.includeCBTIQuestions ?? true
  const pool: QuestionnaireQuestion[] = []
  if (includeOffice) pool.push(...officeExperienceQuestions)
  if (includeCbti) pool.push(...cbtiSupportQuestions)
  const focus = new Set(options?.focusGroups ?? [])
  const weighted = pool.sort((a, b) => {
    const aw = focus.has(a.group) ? 2 : 1
    const bw = focus.has(b.group) ? 2 : 1
    return bw - aw
  })
  const questions = weighted.slice(0, maxQuestions)
  return {
    id: `qs-${Date.now()}`,
    companyId: options?.companyId,
    questions,
    answers: [],
    currentIndex: 0,
    completed: false,
    startedAt: new Date().toISOString(),
  }
}

export function answersToReviewQuestionnaire(answers: QuestionnaireSessionAnswer[]): ReviewQuestionnaire {
  const questionnaire: ReviewQuestionnaire = {}
  for (const answer of answers) {
    ;(questionnaire[answer.field] as QuestionnaireAnswerValue | undefined) = answer.value
  }
  return questionnaire
}

