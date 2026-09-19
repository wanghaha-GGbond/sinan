import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")
const observationsPath = path.resolve(appRoot, "src/db/seeds/research-observations.json")
const externalPath = path.resolve(appRoot, "src/db/seeds/research-external-evidence.json")
const themeEvidencePath = path.resolve(appRoot, "src/db/seeds/research-theme-evidence.json")
const insightsPath = path.resolve(appRoot, "src/db/seeds/reports/company-insight-cards.json")
const indicesPath = path.resolve(appRoot, "src/db/seeds/reports/company-indices.json")
const outputPath = path.resolve(appRoot, "src/db/seeds/reports/company-recent-social-review.md")

const platformLabels = {
  xiaohongshu: "小红书",
  weibo: "微博",
  zhihu: "知乎",
}

function cleanText(value, limit = 180) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim()
  return text.length > limit ? `${text.slice(0, limit)}...` : text
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function isRecentQuery(item) {
  return String(item.querySuffix ?? "").trim().startsWith("2026")
}

function observationBody(item) {
  let text = String(item.visibleText ?? "").replace(/\s+/g, " ").trim()
  if (item.platform === "zhihu" || item.platform === "xiaohongshu") {
    text = text.split("筛选 ").at(-1) ?? text
  }
  if (item.platform === "weibo") {
    text = text.replace(/^NEW\s+\d+\s+搜索结果.*?高级搜索\s*/, "")
  }
  return text
}

function usefulObservation(item) {
  const text = observationBody(item)
  if (item.access !== "ok" || text.length < 120 || !text.includes(item.companyName)) return false
  if (item.platform === "xiaohongshu" && /沪ICP备|营业执照/.test(text)) return false
  if (item.platform === "zhihu" && text.length < 300) return false
  return true
}

function relevantSnippets(item, limit = 2) {
  if (!usefulObservation(item)) return []
  return unique(
    observationBody(item)
      .replace(/智搜回答[\s\S]*$/g, "")
      .split(/(?=\s(?:c\s+|热门\s+c\s+)|展开c|\s\d{4}-\d{2}-\d{2}|\s\d{2}-\d{2})/)
      .map((text) => cleanText(text, 180))
      .filter((text) => text.length >= 30 && text.includes(item.companyName))
  ).slice(0, limit)
}

function relevantDetail(detail, companyName) {
  if (detail.access !== "ok") return false
  const text = `${detail.sourceText ?? ""} ${detail.title ?? ""} ${detail.visibleText ?? ""}`
    .replace(/\s+/g, " ")
    .slice(0, 1000)
  return text.includes(companyName)
}

function platformStats(items, companyName) {
  const details = items.flatMap((item) => item.details ?? [])
  return {
    queries: items.length,
    usable: items.filter(usefulObservation).length,
    attemptedDetails: details.length,
    accessibleDetails: details.filter((detail) => detail.access === "ok").length,
    relevantDetails: details.filter((detail) => relevantDetail(detail, companyName)).length,
  }
}

function evidenceLevel(companyItems) {
  const companyName = companyItems[0]?.companyName ?? ""
  const usablePlatforms = new Set(
    companyItems.filter(usefulObservation).map((item) => item.platform)
  ).size
  const okDetails = companyItems
    .flatMap((item) => item.details ?? [])
    .filter((detail) => relevantDetail(detail, companyName)).length
  if (usablePlatforms >= 2 && okDetails > 0) return "B：多平台搜索证据，并有至少一条公司相关详情页"
  if (usablePlatforms >= 2) return "C+：多平台搜索结果可读，详情仍待验证"
  if (usablePlatforms === 1 || okDetails > 0) return "C：单平台弱证据"
  return "D：仅确认页面可达或取得索引标题"
}

function topicTitles(items, limit = 4) {
  return unique(
    items.flatMap((item) =>
      (item.details ?? []).map((detail) => cleanText(detail.sourceText || detail.title, 90))
    )
  ).slice(0, limit)
}

function verifiedDetailLines(items, companyName, limit = 2) {
  return items
    .flatMap((item) =>
      (item.details ?? [])
        .filter((detail) => relevantDetail(detail, companyName))
        .map((detail) => ({
          title: cleanText(detail.sourceText || detail.title || "详情页", 90),
          excerpt: cleanText(detail.visibleText, 180),
          url: detail.finalUrl || detail.requestedUrl,
        }))
    )
    .slice(0, limit)
}

const observationsDoc = JSON.parse(await readFile(observationsPath, "utf8"))
const externalDoc = JSON.parse(await readFile(externalPath, "utf8"))
const themeEvidenceDoc = JSON.parse(await readFile(themeEvidencePath, "utf8"))
const insightsDoc = JSON.parse(await readFile(insightsPath, "utf8"))
const indicesDoc = JSON.parse(await readFile(indicesPath, "utf8"))
const allObservations = observationsDoc.observations ?? []
const recent = allObservations.filter(isRecentQuery)
const cards = insightsDoc.companies ?? insightsDoc.cards ?? insightsDoc
const cardByCompany = new Map(cards.map((card) => [card.name, card]))
const indexByCompany = new Map((indicesDoc.companies ?? []).map((item) => [item.name, item]))
const companyOrder = cards.map((card) => card.name)
const externalEvidence = externalDoc.evidence ?? []
const themeEvidence = themeEvidenceDoc.evidence ?? []
const detailAttempts = recent.flatMap((item) => item.details ?? [])
const relevantDetails = recent.flatMap((item) =>
  (item.details ?? []).filter((detail) => relevantDetail(detail, item.companyName))
)

const lines = [
  "# 司南公司研究：近期社媒与岗位信号补充",
  "",
  `生成日期：${new Date().toISOString().slice(0, 10)}`,
  "",
  "## 阅读说明",
  "",
  "本报告基于当前研究库生成。官方招聘、财报和公司公告用于判断业务与岗位方向；微博、知乎和小红书用于发现议题与情绪线索。社媒搜索结果不等于事实，未通过详情页或独立来源验证的说法不会写成确定结论。",
  "",
  "## 执行摘要",
  "",
  `- 公司：${companyOrder.length} 家；数据库 observation：${allObservations.length} 条；近期主题 observation：${recent.length} 条。`,
  `- 近期平台覆盖：微博 ${recent.filter((item) => item.platform === "weibo").length} 条、知乎 ${recent.filter((item) => item.platform === "zhihu").length} 条、小红书 ${recent.filter((item) => item.platform === "xiaohongshu").length} 条。`,
  `- 详情验证：尝试 ${detailAttempts.length} 条，技术可访问 ${detailAttempts.filter((item) => item.access === "ok").length} 条，其中与目标公司直接相关 ${relevantDetails.length} 条。`,
  `- 外部校准证据：${externalEvidence.length} 条，其中官方或半官方 ${externalEvidence.filter((item) => /official/.test(item.sourceType ?? "")).length} 条。`,
  `- 职场主题证据：${themeEvidence.length} 条，用于下午茶、食堂、加班、双休和裁员恐慌指数。`,
  "- 当前最可靠的用途是确定公司业务主线、岗位方向和需要追问的问题；尚不足以横向比较精确薪资、加班时长或晋升概率。",
  "",
  "## 跨公司观察",
  "",
  "1. 互联网公司的共同岗位主线集中在 AI、算法、云基础设施、产品和商业化，但具体机会判断以官方招聘与财报为准。",
  "2. 金融公司的公开讨论更容易落在薪酬、职级、分支机构和科技条线差异上，同一集团不同法人、地区和岗位不可混为一个样本。",
  "3. 微博更适合捕捉近期事件和招聘传播；知乎更适合形成问题清单；小红书当前主要保留检索与截图线索，尚不能承担事实验证。",
  "4. 社媒中出现的高薪、年终奖、裁员和加班数字必须回到岗位、职级、年份和劳动合同口径复核。",
  "",
  "## 公司指数总览",
  "",
  "| 公司 | 司南总指数 | 可信度 | 职业机会 | 成长动能 | 工作体验 | 薪酬透明 | 稳定性 |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...(indicesDoc.companies ?? [])
    .slice()
    .sort((a, b) => b.overallScore - a.overallScore)
    .map((item) => `| ${item.name} | ${item.overallScore} | ${item.confidence} | ${item.components.opportunity.score} | ${item.components.growth.score} | ${item.components.workplace.score} | ${item.components.compensationTransparency.score} | ${item.components.stability.score} |`),
  "",
  "## 职场体感指数总览",
  "",
  "| 公司 | 体感标签 | 下午茶续命 | 食堂幸福 | 加班浓度 | 双休可信 | 裁员恐慌 |",
  "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
  ...(indicesDoc.companies ?? [])
    .slice()
    .sort((a, b) => b.funIndices.layoffAnxiety.score - a.funIndices.layoffAnxiety.score)
    .map((item) => `| ${item.name} | ${item.funTag} | ${item.funIndices.afternoonTea.score} | ${item.funIndices.canteen.score} | ${item.funIndices.overtime.score} | ${item.funIndices.weekend.score} | ${item.funIndices.layoffAnxiety.score} |`),
  "",
  "加班浓度和裁员恐慌度越高风险越高；其余三项越高体验越好。详细可信度与证据见 `company-indices.md`。",
  "",
]

for (const companyName of companyOrder) {
  const companyItems = recent.filter((item) => item.companyName === companyName)
  const card = cardByCompany.get(companyName) ?? {}
  const companyIndex = indexByCompany.get(companyName)
  const externalItems = externalEvidence.filter((item) => item.companyName === companyName)
  const opportunity = (card.opportunityDetails ?? [])[0]
  const usablePlatforms = unique(
    companyItems.filter(usefulObservation).map((item) => platformLabels[item.platform])
  )
  const missingPlatforms = ["weibo", "zhihu", "xiaohongshu"]
    .filter((platform) =>
      !companyItems.some((item) => item.platform === platform && usefulObservation(item))
    )
    .map((platform) => platformLabels[platform])

  lines.push(`## ${companyName}`, "")
  lines.push(`- 当前定位：${card.oneLine ?? "待补充公司定位。"}`)
  if (companyIndex) {
    lines.push(`- 司南总指数：${companyIndex.overallScore}/100（可信度 ${companyIndex.confidence}）`)
    lines.push(`- 分项指数：职业机会 ${companyIndex.components.opportunity.score}、成长动能 ${companyIndex.components.growth.score}、工作体验 ${companyIndex.components.workplace.score}、薪酬透明 ${companyIndex.components.compensationTransparency.score}、稳定性 ${companyIndex.components.stability.score}`)
    lines.push(`- 职场体感：${companyIndex.funTag}；下午茶 ${companyIndex.funIndices.afternoonTea.score}、食堂 ${companyIndex.funIndices.canteen.score}、加班 ${companyIndex.funIndices.overtime.score}、双休 ${companyIndex.funIndices.weekend.score}、裁员恐慌 ${companyIndex.funIndices.layoffAnxiety.score}`)
  }
  lines.push(`- 重点部门：${(card.departments ?? []).slice(0, 5).join("、") || "待补充"}`)
  lines.push(`- 近期社媒证据等级：${evidenceLevel(companyItems)}`)
  lines.push(`- 可用平台：${usablePlatforms.join("、") || "暂无"}；薄弱平台：${missingPlatforms.join("、") || "暂无"}。`)
  if (opportunity) {
    lines.push(`- 业务/岗位主线：${opportunity.signal}`)
    lines.push(`  - 依据：${cleanText(opportunity.basis, 240)}`)
    if (opportunity.sourceUrl) lines.push(`  - 来源：${opportunity.sourceUrl}`)
  }
  lines.push("")

  lines.push("### 近期平台证据", "")
  for (const platform of ["weibo", "zhihu", "xiaohongshu"]) {
    const items = companyItems.filter((item) => item.platform === platform)
    const stats = platformStats(items, companyName)
    lines.push(`- **${platformLabels[platform]}**：${stats.queries} 组查询，可用搜索正文 ${stats.usable} 组；详情尝试 ${stats.attemptedDetails} 条，可访问 ${stats.accessibleDetails} 条、公司相关 ${stats.relevantDetails} 条。`)
    for (const item of items) lines.push(`  - 查询：${item.query}（${item.access}）`)
    for (const detail of verifiedDetailLines(items, companyName)) {
      lines.push(`  - 已验证公司相关详情：${detail.title}`)
      if (detail.excerpt) lines.push(`    - 摘要：${detail.excerpt}`)
      if (detail.url) lines.push(`    - 来源：${detail.url}`)
    }
    const titles = topicTitles(items)
    if (titles.length > 0 && stats.relevantDetails === 0) {
      lines.push(`  - 待验证标题：${titles.join("；")}。`)
    }
    const snippets = unique(items.flatMap((item) => relevantSnippets(item, 1))).slice(0, 2)
    for (const snippet of snippets) lines.push(`  - 搜索页线索：${snippet}`)
  }
  lines.push("")

  lines.push("### 判断与边界", "")
  if (opportunity) {
    lines.push(`- **可以支持**：${opportunity.signal}，其依据来自官方或结构化外部证据。`)
  } else {
    lines.push("- **可以支持**：当前只能确认公开讨论议题和检索可达性，尚无足够材料形成业务机会判断。")
  }
  lines.push("- **不能支持**：不能仅凭搜索摘要推断统一薪资水平、真实加班时长、晋升概率或裁员比例。")
  if (externalItems.length > 0) {
    lines.push(`- **校准来源**：${externalItems.slice(0, 3).map((item) => item.title).join("；")}。`)
  }
  const pending = []
  if (
    !companyItems
      .flatMap((item) => item.details ?? [])
      .some((detail) => relevantDetail(detail, companyName))
  ) {
    pending.push("至少打开并核验 1 条员工体验详情")
  }
  if (!usablePlatforms.includes("小红书")) pending.push("人工复核小红书截图或笔记详情")
  if ((card.sentiment?.confidence ?? "low") === "low") pending.push("增加独立平台样本后再解释情绪指数")
  lines.push(`- **下一步验证**：${pending.join("；") || "复核来源发布时间和岗位口径"}。`, "")
}

lines.push(
  "## 结论",
  "",
  "当前资料库已经能够支撑首版公司研究框架和岗位方向导航，但还不适合输出确定性的雇主排名。下一阶段应优先解决详情页验证、岗位/职级拆分和人工分析复核，而不是继续堆叠相同关键词的搜索页。",
  ""
)

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${lines.join("\n")}\n`, "utf8")
console.log(`Wrote ${path.relative(appRoot, outputPath)}`)
