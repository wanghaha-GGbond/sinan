import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")
const seedsDir = path.resolve(appRoot, "src/db/seeds")
const reportsDir = path.resolve(seedsDir, "reports")

const MODEL_VERSION = "sinan-index-v2"
const INDEX_DEFINITIONS = {
  opportunity: { label: "职业机会指数", weight: 0.25 },
  growth: { label: "成长动能指数", weight: 0.2 },
  workplace: { label: "工作体验指数", weight: 0.2 },
  compensationTransparency: { label: "薪酬透明指数", weight: 0.15 },
  stability: { label: "稳定性指数", weight: 0.2 },
}
const FUN_DEFINITIONS = {
  afternoonTea: { label: "下午茶续命指数", highMeans: "茶歇、零食与饮品供给更丰富" },
  canteen: { label: "食堂幸福指数", highMeans: "餐饮供给和补贴体验更好" },
  overtime: { label: "加班浓度", highMeans: "延时、周末或高强度工作信号更多" },
  weekend: { label: "双休可信度", highMeans: "双休制度及实际休息证据更强" },
  layoffAnxiety: { label: "裁员恐慌度", highMeans: "组织收缩、优化或淘汰压力信号更多" },
}
const THEME_PATTERNS = {
  afternoonTea: {
    positive: [/下午茶/, /茶水间/, /零食/, /水果/, /咖啡/, /酸奶/, /饮品/],
    negative: [/取消.{0,8}下午茶/, /不再提供.{0,8}下午茶/, /福利缩水/],
  },
  canteen: {
    positive: [/免费三餐/, /免费.{0,5}(早餐|午餐|晚餐)/, /食堂.{0,12}(丰富|好吃|免费|补贴)/, /餐补/, /夜宵/],
    negative: [/没有食堂/, /食堂.{0,10}(难吃|涨价|缩水)/],
  },
  overtime: {
    positive: [/加班到(深夜|凌晨)/, /长期加班/, /经常加班/, /周末加班/, /很少准点下班/, /996/, /大小周/, /单休/, /工作强度.{0,5}(大|高)/],
    negative: [/不加班/, /很少加班/, /准点下班/, /取消大小周/, /加班需.{0,6}(申请|审批)/],
  },
  weekend: {
    positive: [/全员双休/, /取消大小周/, /统一双休/, /周末双休/, /加班需.{0,6}(申请|审批)/],
    negative: [/周末加班/, /大小周/, /单休/, /周六.{0,4}(上班|值班)/],
  },
  layoffAnxiety: {
    positive: [/裁员/, /人员优化/, /组织优化/, /末位淘汰/, /绩效淘汰/, /HC冻结/, /招聘冻结/, /PIP/, /降本增效/, /减员/],
    negative: [/员工.{0,8}(增加|增长|净增)/, /增员/, /扩招/, /裁员.{0,8}(不实|否认)/, /开放.{0,8}岗位/, /招聘.{0,8}(启动|进行)/],
  },
}
const SOURCE_WEIGHT = { high: 1, medium: 0.7, low: 0.4 }

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value))
const round = (value) => Number(value.toFixed(1))
const normalizedText = (value) => String(value ?? "").replace(/\s+/g, " ").trim()

function observationBody(item) {
  let text = normalizedText(item.visibleText)
  if (item.platform === "zhihu" || item.platform === "xiaohongshu") {
    text = text.split("筛选 ").at(-1) ?? text
  }
  return text
}

function observationIsUsable(item) {
  const text = observationBody(item)
  if (item.access !== "ok" || text.length < 120 || !text.includes(item.companyName)) return false
  if (item.platform === "xiaohongshu" && /沪ICP备|营业执照/.test(text)) return false
  if (item.platform === "zhihu" && text.length < 300) return false
  return true
}

function detailIsRelevant(detail, companyName) {
  if (detail.access !== "ok") return false
  const text = normalizedText(`${detail.sourceText ?? ""} ${detail.title ?? ""} ${detail.visibleText ?? ""}`)
  return text.slice(0, 1200).includes(companyName)
}

function scoreConfidence({ officialCount, usablePlatforms, relevantDetails, recentUsable }) {
  return round(clamp(
    Math.min(30, officialCount * 10) +
      Math.min(30, usablePlatforms * 10) +
      Math.min(20, relevantDetails * 8) +
      Math.min(15, recentUsable * 3) +
      (officialCount > 0 && usablePlatforms > 0 ? 5 : 0)
  ))
}

function makeComponent(score, confidence, evidenceCount, reasons, limitations) {
  return {
    score: round(clamp(score)),
    confidence: round(clamp(confidence)),
    evidenceCount,
    reasons: reasons.filter(Boolean),
    limitations: limitations.filter(Boolean),
  }
}

function bestIndependentObservations(items) {
  const byPlatform = new Map()
  for (const item of items) {
    const existing = byPlatform.get(item.platform)
    const itemScore = observationBody(item).length + (String(item.querySuffix ?? "").startsWith("2026") ? 500 : 0)
    const existingScore = existing ? observationBody(existing).length + (String(existing.querySuffix ?? "").startsWith("2026") ? 500 : 0) : -1
    if (!existing || itemScore > existingScore) byPlatform.set(item.platform, item)
  }
  return [...byPlatform.values()]
}

function uniqueRelevantDetails(items, companyName) {
  const details = items.flatMap((item) => (item.details ?? []).filter((detail) => detailIsRelevant(detail, companyName)))
  return [...new Map(details.map((item) => [item.finalUrl || item.requestedUrl || `${item.title}:${item.sourceText}`, item])).values()]
}

function themeObservationSignals(text, platform, sourceTitle, sourceKey) {
  const signals = []
  for (const [key, patterns] of Object.entries(THEME_PATTERNS)) {
    const positive = patterns.positive.some((pattern) => pattern.test(text))
    const negative = patterns.negative.some((pattern) => pattern.test(text))
    if (!positive && !negative) continue
    let effect = positive ? 0.55 : 0
    if (negative) effect -= 0.55
    signals.push({
      key,
      effect,
      weight: platform === "detail" ? 0.8 : 0.45,
      sourceTitle,
      sourceKey: `${sourceKey}:${key}`,
      sourceKind: platform === "detail" ? "platform_detail" : "platform_search",
      url: sourceKey.replace(/^(platform|detail):/, ""),
    })
  }
  return signals
}

function buildFunComponent(key, signals, externalItems) {
  const externalSignals = externalItems
    .filter((item) => Number.isFinite(item.effects?.[key]))
    .map((item) => ({
      effect: item.effects[key],
      weight: SOURCE_WEIGHT[item.confidence] ?? 0.4,
      sourceTitle: item.title,
      sourceKey: item.url,
      sourceKind: "theme_external",
      url: item.url,
      caveat: item.caveat,
    }))
  const deduped = new Map()
  for (const item of [...signals.filter((item) => item.key === key), ...externalSignals]) {
    const existing = deduped.get(item.sourceKey)
    if (!existing || item.weight > existing.weight) deduped.set(item.sourceKey, item)
  }
  const allSignals = [...deduped.values()]
  const weighted = allSignals.reduce((sum, item) => sum + item.effect * item.weight, 0)
  const weightTotal = allSignals.reduce((sum, item) => sum + item.weight, 0)
  const rawScore = weightTotal ? 50 + (weighted / Math.max(1, Math.sqrt(weightTotal))) * 28 : 50
  const confidence = clamp(weightTotal * 22 + new Set(allSignals.map((item) => item.sourceTitle)).size * 5, 0, 85)
  const score = 50 + (clamp(rawScore) - 50) * (confidence / 100)
  const reasons = allSignals.slice(0, 4).map((item) => item.sourceTitle)
  const caveats = externalSignals.map((item) => item.caveat).filter(Boolean).slice(0, 2)
  return {
    ...makeComponent(
    score,
    confidence,
    allSignals.length,
    reasons.length ? reasons : ["暂未找到可用的公司相关主题证据"],
    [
      ...caveats,
      confidence < 35 ? "证据稀薄，分数已强制向中性值 50 收缩" : "同一公司不同园区、部门和岗位可能差异很大",
    ]
    ),
    evidenceRefs: allSignals.map((item) => ({
      sourceKind: item.sourceKind,
      sourceKey: item.sourceKey,
      title: item.sourceTitle,
      url: item.url,
      effect: round(item.effect),
      weight: round(item.weight),
    })),
  }
}

function funTag(fun) {
  const parts = []
  if (fun.afternoonTea.score >= 57) parts.push("茶水间有盼头")
  if (fun.canteen.score >= 57) parts.push("食堂能打")
  if (fun.overtime.score >= 57) parts.push("夜色浓度偏高")
  if (fun.weekend.score >= 57) parts.push("周末相对可信")
  if (fun.layoffAnxiety.score >= 57) parts.push("组织风声偏紧")
  if (!parts.length) return "体感证据不足，先别急着贴标签"
  return parts.slice(0, 2).join("，")
}

const targets = JSON.parse(await readFile(path.resolve(seedsDir, "research-targets.json"), "utf8"))
const observationsDoc = JSON.parse(await readFile(path.resolve(seedsDir, "research-observations.json"), "utf8"))
const externalDoc = JSON.parse(await readFile(path.resolve(seedsDir, "research-external-evidence.json"), "utf8"))
const themeDoc = JSON.parse(await readFile(path.resolve(seedsDir, "research-theme-evidence.json"), "utf8"))
const insightsDoc = JSON.parse(await readFile(path.resolve(reportsDir, "company-insight-cards.json"), "utf8"))

const observations = observationsDoc.observations ?? []
const externalEvidence = externalDoc.evidence ?? []
const themeEvidence = themeDoc.evidence ?? []
const cards = insightsDoc.cards ?? []
const cardByCompany = new Map(cards.map((card) => [card.name, card]))
const generatedAt = new Date().toISOString()

const companies = targets.companies.map((target) => {
  const companyObservations = observations.filter((item) => item.companyName === target.name)
  const allUsable = companyObservations.filter(observationIsUsable)
  const usable = bestIndependentObservations(allUsable)
  const usablePlatforms = new Set(usable.map((item) => item.platform)).size
  const recentUsable = usable.filter((item) => String(item.querySuffix ?? "").startsWith("2026")).length
  const relevantDetails = uniqueRelevantDetails(companyObservations, target.name)
  const external = externalEvidence.filter((item) => item.companyName === target.name)
  const official = external.filter((item) => String(item.sourceType ?? "").startsWith("official"))
  const themes = themeEvidence.filter((item) => item.companyName === target.name)
  const card = cardByCompany.get(target.name) ?? {}
  const opportunitySignals = (card.opportunityDetails ?? []).filter((item) => item.evidenceUsable)
  const riskSignals = (card.riskDetails ?? []).filter((item) => item.evidenceUsable)
  const socialSources = usable.map((item) => observationBody(item))
  const externalSources = external.map((item) => `${item.title ?? ""} ${item.excerpt ?? ""}`)
  const detailSources = relevantDetails.map((item) => normalizedText(item.visibleText))
  const confidence = scoreConfidence({
    officialCount: official.length,
    usablePlatforms,
    relevantDetails: relevantDetails.length,
    recentUsable,
  })

  const hiringSignals = [...socialSources, ...externalSources].filter((text) => /招聘|校招|社招|岗位|人才|实习/.test(text)).length
  const growthSignals = externalSources.filter((text) => /增长|投入|扩张|新增|AI|人工智能|大模型|云|科技|研发/.test(text)).length
  const negativeSignals = [...socialSources, ...detailSources].filter((text) => /裁员|降薪|奖金缩水|离职|压力|加班|强度|清零|维权/.test(text)).length
  const positiveWorkplaceSignals = [...socialSources, ...detailSources].filter((text) => /双休|不打卡|福利|氛围|成长|调休|晋升|体验好/.test(text)).length
  const compensationSignals = [...socialSources, ...externalSources, ...detailSources].filter((text) => /薪资|薪酬|工资|奖金|年终奖|职级|调薪|期权|股票/.test(text)).length
  const financialSources = official.filter((item) => item.sourceType === "official_financial_report").length
  const departments = card.departments ?? []
  const socialConfidence = clamp(usablePlatforms * 22 + relevantDetails.length * 12, 0, 100)

  const opportunityScore = 38 + Math.min(18, official.filter((item) => /careers|recruitment/.test(item.sourceType ?? "")).length * 9) + Math.min(16, opportunitySignals.length * 8) + Math.min(12, departments.length * 2.4) + Math.min(10, hiringSignals * 2) + Math.min(6, recentUsable * 1.5)
  const growthScore = 42 + Math.min(18, growthSignals * 6) + Math.min(15, opportunitySignals.length * 7.5) + Math.min(10, financialSources * 10) - Math.min(15, riskSignals.length * 7.5)
  const rawWorkplace = clamp(Number(card.sentiment?.score ?? 5) * 10 + Math.min(8, positiveWorkplaceSignals * 1.5) - Math.min(16, negativeSignals * 1.5))
  const workplaceScore = 50 + (rawWorkplace - 50) * (socialConfidence / 100)
  const compensationScore = 25 + Math.min(30, relevantDetails.filter((item) => /薪资|薪酬|工资|奖金|年终奖|职级|期权/.test(normalizedText(item.visibleText))).length * 15) + Math.min(25, compensationSignals * 5) + Math.min(10, usablePlatforms * 3) + Math.min(10, recentUsable * 2)
  const stabilityScore = 52 + Math.min(18, financialSources * 12) + Math.min(12, growthSignals * 4) - Math.min(12, riskSignals.length * 6) - Math.min(18, negativeSignals * 1.2)

  const components = {
    opportunity: makeComponent(opportunityScore, confidence, official.length + usable.length, [`${official.length} 条官方来源，${opportunitySignals.length} 条可用机会信号`, `${departments.length} 个重点部门，${hiringSignals} 条独立证据包含招聘信号`], [usablePlatforms < 2 ? "员工侧平台覆盖不足" : "岗位数量尚未结构化到城市和职级"]),
    growth: makeComponent(growthScore, Math.min(100, confidence + financialSources * 10), external.length, [`${growthSignals} 条官方材料包含增长或技术投入信号`, `${financialSources} 条财务报告来源`], [financialSources === 0 ? "缺少最新财报或经营公告" : "业务增长不等于个人岗位成长"]),
    workplace: makeComponent(workplaceScore, socialConfidence, usable.length + relevantDetails.length, [`${usablePlatforms} 个可用社媒平台，${relevantDetails.length} 条公司相关详情`, `正向体验证据 ${positiveWorkplaceSignals} 条，风险体验证据 ${negativeSignals} 条`], [socialConfidence < 60 ? "员工体验样本不足，分数已向 50 收缩" : "公开发言可能存在选择偏差"]),
    compensationTransparency: makeComponent(compensationScore, Math.min(confidence, 70), compensationSignals + relevantDetails.length, [`${compensationSignals} 条独立证据包含薪酬、奖金或职级信号`, `${relevantDetails.length} 条公司相关详情可用于复核`], ["该指数衡量信息透明度，不代表薪酬高低", "仍需按岗位、职级、城市和年份拆分"]),
    stability: makeComponent(stabilityScore, Math.min(100, confidence + financialSources * 10), official.length + riskSignals.length, [`${financialSources} 条财务报告来源，${riskSignals.length} 条结构化风险信号`, `${negativeSignals} 条社媒证据包含组织或压力信号`], [financialSources === 0 ? "缺少财务经营校准" : "集团稳定不代表单个业务线稳定"]),
  }

  // Theme-specific collection runs are independent evidence candidates. Core indices
  // still use one best observation per platform to avoid volume-driven score inflation.
  const observationThemeSignals = allUsable.flatMap((item) => themeObservationSignals(observationBody(item), item.platform, `${item.platform}搜索：${item.query}`, `platform:${item.finalUrl || item.requestedUrl || item.platform}`))
  const detailThemeSignals = relevantDetails.flatMap((item) => themeObservationSignals(normalizedText(item.visibleText), "detail", `详情页：${item.title || item.sourceText || "员工讨论"}`, `detail:${item.finalUrl || item.requestedUrl || item.title || item.sourceText}`))
  const themeSignals = [...observationThemeSignals, ...detailThemeSignals]
  const funIndices = Object.fromEntries(Object.keys(FUN_DEFINITIONS).map((key) => [key, buildFunComponent(key, themeSignals, themes)]))

  const rawOverall = Object.entries(INDEX_DEFINITIONS).reduce((sum, [key, definition]) => sum + components[key].score * definition.weight, 0)
  const overall = 50 + (rawOverall - 50) * (confidence / 100)

  return {
    name: target.name,
    city: target.city,
    industry: target.industry,
    overallScore: round(overall),
    rawOverallScore: round(rawOverall),
    confidence,
    modelVersion: MODEL_VERSION,
    components,
    funTag: funTag(funIndices),
    funIndices,
  }
})

const output = {
  generatedAt,
  modelVersion: MODEL_VERSION,
  scale: "0-100",
  methodology: {
    weights: Object.fromEntries(Object.entries(INDEX_DEFINITIONS).map(([key, item]) => [key, item.weight])),
    confidenceAdjustment: "overall = 50 + (rawOverall - 50) * confidence / 100",
    funIndexDirections: Object.fromEntries(Object.entries(FUN_DEFINITIONS).map(([key, item]) => [key, item.highMeans])),
    note: "所有低置信度结果向中性值50收缩。趣味指数是公司级公开证据体感，不代表每个园区、部门或员工。",
  },
  companies,
}

const jsonPath = path.resolve(reportsDir, "company-indices.json")
const markdownPath = path.resolve(reportsDir, "company-indices.md")
await mkdir(reportsDir, { recursive: true })
await writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`, "utf8")

const lines = [
  "# 司南公司指数",
  "",
  `生成时间：${generatedAt}`,
  "",
  "## 方法",
  "",
  "- 基础总指数满分 100：职业机会 25%、成长动能 20%、工作体验 20%、薪酬透明 15%、稳定性 20%。",
  "- 趣味指数不进入基础总分；它们回答更具体的职场体感问题，并单独显示可信度。",
  "- 加班浓度和裁员恐慌度越高，风险越高；下午茶、食堂幸福和双休可信度越高，体验越好。",
  "- 搜索结果、媒体报道和官方资料按来源质量加权；低置信度分数向 50 收缩。",
  "",
  "## 趣味指数总览",
  "",
  "| 公司 | 体感标签 | 下午茶续命 | 食堂幸福 | 加班浓度 | 双休可信 | 裁员恐慌 |",
  "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
]

for (const company of [...companies].sort((a, b) => b.overallScore - a.overallScore)) {
  const f = company.funIndices
  lines.push(`| ${company.name} | ${company.funTag} | ${f.afternoonTea.score} (${f.afternoonTea.confidence}) | ${f.canteen.score} (${f.canteen.confidence}) | ${f.overtime.score} (${f.overtime.confidence}) | ${f.weekend.score} (${f.weekend.confidence}) | ${f.layoffAnxiety.score} (${f.layoffAnxiety.confidence}) |`)
}

lines.push("", "括号内为可信度。50 表示当前证据接近中性或不足，不表示公司表现一定处于行业中位。", "", "## 基础指数总览", "", "| 公司 | 司南总指数 | 可信度 | 职业机会 | 成长动能 | 工作体验 | 薪酬透明 | 稳定性 |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |")
for (const company of [...companies].sort((a, b) => b.overallScore - a.overallScore)) {
  lines.push(`| ${company.name} | ${company.overallScore} | ${company.confidence} | ${company.components.opportunity.score} | ${company.components.growth.score} | ${company.components.workplace.score} | ${company.components.compensationTransparency.score} | ${company.components.stability.score} |`)
}

for (const company of companies) {
  lines.push("", `## ${company.name}`, "", `- 体感标签：**${company.funTag}**`, `- 司南总指数：**${company.overallScore}** / 100（原始加权 ${company.rawOverallScore}，证据可信度 ${company.confidence}）`, "- 趣味指数：")
  for (const [key, definition] of Object.entries(FUN_DEFINITIONS)) {
    const component = company.funIndices[key]
    lines.push(`  - **${definition.label} ${component.score}**（可信度 ${component.confidence}，证据 ${component.evidenceCount}）`)
    for (const reason of component.reasons) lines.push(`    - 依据：${reason}`)
    for (const limitation of component.limitations) lines.push(`    - 限制：${limitation}`)
  }
  lines.push("- 基础指数：")
  for (const [key, definition] of Object.entries(INDEX_DEFINITIONS)) {
    const component = company.components[key]
    lines.push(`  - **${definition.label} ${component.score}**（可信度 ${component.confidence}，证据 ${component.evidenceCount}）`)
  }
}

await writeFile(markdownPath, `${lines.join("\n")}\n`, "utf8")
console.log(`Wrote ${path.relative(appRoot, jsonPath)} and ${path.relative(appRoot, markdownPath)}`)
