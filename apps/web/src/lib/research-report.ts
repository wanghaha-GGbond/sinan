import insightData from "@/db/seeds/reports/company-insight-cards.json"
import indexData from "@/db/seeds/reports/company-indices.json"

export type ScoreDetail = {
  score: number
  rawScore?: number
  confidence: number
  evidenceCount: number
  effectiveSampleSize?: number
  sourceCount?: number
  dataAsOf?: string
  reasons: string[]
  limitations: string[]
  evidenceRefs?: Array<{
    evidenceId?: string
    sourceKind?: string
    title?: string
    url?: string
    effect?: number
    weight?: number
  }>
}

export type CompanyIndex = {
  name: string
  city: string
  industry: string
  overallScore: number | null
  rawOverallScore: number
  confidence: number
  funTag: string
  components: Record<string, ScoreDetail>
  funIndices: Record<string, ScoreDetail>
  dataAsOf?: string
  runId?: string
  publishStatus?: "candidate" | "published"
  slices?: Array<ScoreDetail & { indexKey: string; scopeType: string; scopeKey: string }>
}

export type CompanyCard = {
  name: string
  city: string
  industry: string
  generatedAt: string
  recommendationTier: string
  recommendationBasis: string
  oneLine: string
  departments: string[]
  sentiment: {
    score: number
    sampleCount: number
    confidence: string
    components: Record<string, number>
  }
  opportunityDetails: Array<{
    signal: string
    basis: string
    sourceUrl: string
    evidenceUsable: boolean
  }>
  riskDetails: Array<{
    signal: string
    basis: string
    sourceUrl: string
    evidenceUsable: boolean
  }>
  candidateAdvice: string
  platformSummary: Record<string, {
    label: string
    access: string
    score: number
    excerpt: string
    evidenceUsable: boolean
  }>
  externalEvidence: Array<{
    title: string
    url: string
    sourceType: string
    summary: string
  }>
}

export const researchSummary = (insightData as unknown as {
  generatedAt: string
  summary: { companies: number; observations: number; usableObservations: number; externalEvidence: number }
}).summary

export const researchGeneratedAt = (insightData as { generatedAt: string }).generatedAt
export const companyCards = (insightData as unknown as { cards: CompanyCard[] }).cards
export const companyIndices = (indexData as unknown as { companies: CompanyIndex[] }).companies

const companySlugs: Record<string, string> = {
  字节跳动: "bytedance",
  腾讯: "tencent",
  阿里巴巴: "alibaba",
  美团: "meituan",
  小红书: "xiaohongshu",
  招商银行: "cmb",
  平安集团: "ping-an",
  中信证券: "citic-securities",
  蚂蚁集团: "ant-group",
  东方财富: "east-money",
}

export function getCompanySlug(name: string) {
  return companySlugs[name] ?? encodeURIComponent(name)
}

export function getResearchCompany(slug: string) {
  const name = Object.entries(companySlugs).find(([, value]) => value === slug)?.[0]
  if (!name) return null
  const card = companyCards.find((item) => item.name === name)
  const index = companyIndices.find((item) => item.name === name)
  return card && index ? { card, index } : null
}

export const componentLabels: Record<string, string> = {
  opportunity: "职业机会",
  growth: "成长动能",
  workplace: "工作体验",
  compensationTransparency: "薪酬透明",
  stability: "稳定性",
}

export const funIndexLabels: Record<string, string> = {
  afternoonTea: "下午茶续命",
  canteen: "食堂幸福",
  overtime: "加班浓度",
  weekend: "双休可信",
  layoffAnxiety: "裁员恐慌",
}
