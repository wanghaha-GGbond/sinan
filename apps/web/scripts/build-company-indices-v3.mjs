import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { buildIndexDocument, MODEL_VERSION } from "./research-index-v3-core.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")
const seedsDir = path.resolve(appRoot, "src/db/seeds")
const reportsDir = path.resolve(seedsDir, "reports")

function argValue(name) {
  const value = process.argv.find((arg) => arg.startsWith(`${name}=`))
  return value?.slice(name.length + 1)
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"))
  } catch (error) {
    if (error?.code === "ENOENT" && fallback !== undefined) return fallback
    throw error
  }
}

async function loadInternalReviews() {
  const reviewPath = path.resolve(
    appRoot,
    argValue("--reviews") ?? "src/db/seeds/research-internal-reviews.json"
  )
  const local = await readJson(reviewPath, null)
  if (local) return local.reviews ?? local
  if (!process.env.DATABASE_URL || process.env.RESEARCH_SKIP_DB === "1") return []

  try {
    const { Pool } = await import("pg")
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    try {
      const result = await pool.query(`
        SELECT
          c.name AS "companyName",
          r.title,
          r.content,
          r.city,
          r.job_title AS "jobFamily",
          r.department_hint AS "departmentName",
          r.questionnaire,
          r.direction_score AS "directionScore",
          r.author_role AS "authorRole",
          r.status,
          r.created_at AS "createdAt",
          CASE WHEN r.author_role IN ('current_employee', 'former_employee', 'intern', 'contractor') THEN TRUE ELSE FALSE END AS verified
        FROM reviews r
        JOIN companies c ON c.id = r.company_id
        WHERE r.status IN ('visible', 'limited_visible')
          AND r.deleted_at IS NULL
      `)
      return result.rows
    } finally {
      await pool.end()
    }
  } catch (error) {
    console.warn(`Skipping Postgres review input: ${error.message}`)
    return []
  }
}

function displayScore(company) {
  return company.overallScore == null ? "待补证据" : company.overallScore
}

function buildMarkdown(document) {
  const lines = [
    "# 司南公司指数 v3",
    "",
    `生成时间：${document.generatedAt}`,
    `数据截止：${document.dataAsOf}`,
    `算法版本：${document.modelVersion}`,
    "",
    "## 方法",
    "",
    "- 核心指数权重：职业机会 25%、成长动能 20%、工作体验 20%、薪酬透明 15%、稳定性 20%。",
    "- 证据权重由来源质量、时间衰减、独立性、相关度和站内评价可信度共同决定。",
    "- 有效样本量使用 nEff=(sum(weight)^2)/sum(weight^2)，同一 URL、作者或转载簇最多贡献 25%。",
    "- 低置信度分数向中性值 50 收缩；置信度低于 30 的公司不进入横向排行榜。",
    "- 加班浓度、裁员恐慌度越高风险越高；下午茶、食堂和双休可信度越高体验越好。",
    "",
    "## 核心指数",
    "",
    "| 公司 | 总指数 | 置信度 | 职业机会 | 成长动能 | 工作体验 | 薪酬透明 | 稳定性 |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...document.companies
      .slice()
      .sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1))
      .map((company) => `| ${company.name} | ${displayScore(company)} | ${company.confidence} | ${company.components.opportunity.score} | ${company.components.growth.score} | ${company.components.workplace.score} | ${company.components.compensationTransparency.score} | ${company.components.stability.score} |`),
    "",
    "## 职场体感指数",
    "",
    "| 公司 | 体感标签 | 下午茶续命 | 食堂幸福 | 加班浓度 | 双休可信 | 裁员恐慌 |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ...document.companies
      .slice()
      .sort((a, b) => b.funIndices.layoffAnxiety.score - a.funIndices.layoffAnxiety.score)
      .map((company) => `| ${company.name} | ${company.funTag} | ${company.funIndices.afternoonTea.score}（${company.funIndices.afternoonTea.confidence}%） | ${company.funIndices.canteen.score}（${company.funIndices.canteen.confidence}%） | ${company.funIndices.overtime.score}（${company.funIndices.overtime.confidence}%） | ${company.funIndices.weekend.score}（${company.funIndices.weekend.confidence}%） | ${company.funIndices.layoffAnxiety.score}（${company.funIndices.layoffAnxiety.confidence}%） |`),
    "",
    "## 证据与限制",
    "",
    `- 原始 observation：${document.sourceCounts.observations} 条；外部证据：${document.sourceCounts.externalEvidence} 条；主题证据：${document.sourceCounts.themeEvidence} 条；站内评价：${document.sourceCounts.internalReviews} 条。`,
    `- 标准化指数信号：${document.sourceCounts.normalizedSignals} 条。每个分数均可通过 evidenceSignals 和数据库 evidence link 回溯。`,
    "- 公司级结果不代表每个园区、部门和岗位；切片只有在有效样本量至少 3、独立来源至少 2 时才展示。",
    "- 候选结果需要分析师审核后才能发布到生产 Postgres。",
    "",
  ]
  return `${lines.join("\n")}\n`
}

const [targetsDoc, observationsDoc, externalDoc, themeDoc, internalReviews] = await Promise.all([
  readJson(path.resolve(seedsDir, "research-targets.json")),
  readJson(path.resolve(seedsDir, "research-observations.json")),
  readJson(path.resolve(seedsDir, "research-external-evidence.json"), { evidence: [] }),
  readJson(path.resolve(seedsDir, "research-theme-evidence.json"), { evidence: [] }),
  loadInternalReviews(),
])

const dataAsOf = argValue("--data-as-of") ?? new Date().toISOString().slice(0, 10)
const document = buildIndexDocument({
  targets: targetsDoc.companies ?? [],
  observations: observationsDoc.observations ?? [],
  externalEvidence: externalDoc.evidence ?? [],
  themeEvidence: themeDoc.evidence ?? [],
  internalReviews,
  dataAsOf,
})

await mkdir(reportsDir, { recursive: true })
await writeFile(path.resolve(reportsDir, "company-indices.json"), `${JSON.stringify(document, null, 2)}\n`, "utf8")
await writeFile(path.resolve(reportsDir, "company-indices.md"), buildMarkdown(document), "utf8")

console.log(`Wrote company-indices.json with ${document.companies.length} companies using ${MODEL_VERSION}`)
console.log(`Normalized ${document.sourceCounts.normalizedSignals} evidence signals; internal reviews: ${document.sourceCounts.internalReviews}`)
