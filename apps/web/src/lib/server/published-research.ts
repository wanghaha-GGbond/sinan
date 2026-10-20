import { and, desc, eq } from "drizzle-orm"

import type { CompanyIndex, ScoreDetail } from "@/lib/research-report"

type PublishedSnapshot = {
  generatedAt: string
  dataAsOf: string
  runId: string
  companies: CompanyIndex[]
}

type PublishedScoreRow = {
  score: unknown
  rawScore: unknown
  confidence: unknown
  evidenceCount: unknown
  effectiveSampleSize: unknown
  sourceCount: unknown
  reasons: unknown
  limitations: unknown
  evidenceRefs: unknown
  dataAsOf?: string
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : []
}

function scoreDetail(row: PublishedScoreRow): ScoreDetail {
  return {
    score: row.score == null ? 50 : asNumber(row.score, 50),
    rawScore: asNumber(row.rawScore, row.score == null ? 50 : Number(row.score)),
    confidence: asNumber(row.confidence),
    evidenceCount: asNumber(row.evidenceCount),
    effectiveSampleSize: asNumber(row.effectiveSampleSize),
    sourceCount: asNumber(row.sourceCount),
    dataAsOf: row.dataAsOf,
    reasons: asArray(row.reasons),
    limitations: asArray(row.limitations),
    evidenceRefs: Array.isArray(row.evidenceRefs) ? row.evidenceRefs : [],
  }
}

function funTag(funIndices: Record<string, ScoreDetail>) {
  const tags: string[] = []
  if ((funIndices.afternoonTea?.confidence ?? 0) >= 30 && (funIndices.afternoonTea?.score ?? 0) >= 57) tags.push("茶水间有盼头")
  if ((funIndices.canteen?.confidence ?? 0) >= 30 && (funIndices.canteen?.score ?? 0) >= 57) tags.push("食堂能打")
  if ((funIndices.overtime?.confidence ?? 0) >= 30 && (funIndices.overtime?.score ?? 0) >= 57) tags.push("夜色浓度偏高")
  if ((funIndices.weekend?.confidence ?? 0) >= 30 && (funIndices.weekend?.score ?? 0) >= 57) tags.push("周末相对可信")
  if ((funIndices.layoffAnxiety?.confidence ?? 0) >= 30 && (funIndices.layoffAnxiety?.score ?? 0) >= 57) tags.push("组织风声偏紧")
  return tags.length ? tags.slice(0, 2).join("，") : "体感证据不足，先别急着贴标签"
}

export async function getPublishedResearchSnapshot(): Promise<PublishedSnapshot | null> {
  try {
    const [{ db }, { companies }, { companyIndexScores, researchIndexRuns }] = await Promise.all([
      import("@/db/client"),
      import("@/db/schema/companies"),
      import("@/db/schema/research-indices"),
    ])
    const [run] = await db
      .select()
      .from(researchIndexRuns)
      .where(eq(researchIndexRuns.status, "published"))
      .orderBy(desc(researchIndexRuns.generatedAt))
      .limit(1)
    if (!run) return null

    const rows = await db
      .select({ score: companyIndexScores, company: companies })
      .from(companyIndexScores)
      .innerJoin(companies, eq(companyIndexScores.companyId, companies.id))
      .where(and(eq(companyIndexScores.runId, run.id), eq(companyIndexScores.publishStatus, "published")))

    const byCompany = new Map<string, CompanyIndex>()
    for (const row of rows) {
      const score = row.score
      const company = row.company
      if (!byCompany.has(company.name)) {
        byCompany.set(company.name, {
          name: company.name,
          city: company.city,
          industry: company.industry,
          overallScore: null,
          rawOverallScore: 50,
          confidence: 0,
          funTag: "体感证据不足，先别急着贴标签",
          components: {},
          funIndices: {},
          dataAsOf: run.dataAsOf,
          runId: run.id,
          publishStatus: "published",
          slices: [],
        })
      }
      const target = byCompany.get(company.name)!
      const detail = scoreDetail({
        ...score,
        rawScore: score.rawScore,
        evidenceCount: score.evidenceCount,
        effectiveSampleSize: score.effectiveSampleSize,
        sourceCount: score.sourceCount,
        dataAsOf: run.dataAsOf,
      })
      if (score.scopeType === "company" && score.indexKey === "overall") {
        target.overallScore = score.score == null ? null : asNumber(score.score, 50)
        target.rawOverallScore = asNumber(score.rawScore, 50)
        target.confidence = asNumber(score.confidence)
      } else if (score.scopeType === "company" && score.indexGroup === "core") {
        target.components[score.indexKey] = detail
      } else if (score.scopeType === "company" && score.indexGroup === "fun") {
        target.funIndices[score.indexKey.replace(/^fun_/, "")] = detail
      } else {
        target.slices?.push({
          ...detail,
          indexKey: score.indexKey.replace(/^fun_/, ""),
          scopeType: score.scopeType,
          scopeKey: score.scopeKey,
        })
      }
      target.funTag = funTag(target.funIndices)
    }
    return {
      generatedAt: run.generatedAt.toISOString(),
      dataAsOf: run.dataAsOf,
      runId: run.id,
      companies: [...byCompany.values()],
    }
  } catch {
    return null
  }
}

export async function getPublishedResearchCompany(name: string) {
  const snapshot = await getPublishedResearchSnapshot()
  return snapshot?.companies.find((company) => company.name === name) ?? null
}
