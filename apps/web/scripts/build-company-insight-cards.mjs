import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")

const observationsArg = process.argv.find((arg) => arg.startsWith("--observations="))
const targetsArg = process.argv.find((arg) => arg.startsWith("--targets="))
const externalArg = process.argv.find((arg) => arg.startsWith("--external="))
const outputArg = process.argv.find((arg) => arg.startsWith("--output="))
const reportArg = process.argv.find((arg) => arg.startsWith("--report="))

const observationsPath = path.resolve(
  appRoot,
  observationsArg?.slice("--observations=".length) ?? "src/db/seeds/research-observations.json"
)
const targetsPath = path.resolve(
  appRoot,
  targetsArg?.slice("--targets=".length) ?? "src/db/seeds/research-targets.json"
)
const externalPath = path.resolve(
  appRoot,
  externalArg?.slice("--external=".length) ?? "src/db/seeds/research-external-evidence.json"
)
const outputPath = path.resolve(
  appRoot,
  outputArg?.slice("--output=".length) ?? "src/db/seeds/reports/company-insight-cards.json"
)
const reportPath = path.resolve(
  appRoot,
  reportArg?.slice("--report=".length) ?? "src/db/seeds/reports/company-insight-cards.md"
)

const platformLabels = {
  boss_zhipin: "Boss 直聘",
  xiaohongshu: "小红书",
  weibo: "微博",
  zhihu: "知乎",
}

const departmentKeywordRules = [
  ["算法", "算法与 AI"],
  ["AI", "算法与 AI"],
  ["大模型", "算法与 AI"],
  ["研发", "研发与工程"],
  ["工程", "研发与工程"],
  ["技术", "研发与工程"],
  ["产品", "产品与设计"],
  ["设计", "产品与设计"],
  ["运营", "运营与内容"],
  ["内容", "运营与内容"],
  ["商业化", "商业化与销售"],
  ["销售", "商业化与销售"],
  ["金融科技", "金融科技"],
  ["风控", "风控与合规"],
  ["合规", "风控与合规"],
  ["投研", "投研与交易"],
  ["交易", "投研与交易"],
]

const opportunityKeywordRules = [
  ["AI", "AI 与智能化岗位可能是重点机会"],
  ["算法", "算法与数据方向值得关注"],
  ["云", "云计算和基础设施方向值得关注"],
  ["金融科技", "金融科技方向值得关注"],
  ["内容", "内容生态和社区运营方向值得关注"],
  ["电商", "电商与交易增长方向值得关注"],
  ["本地生活", "本地生活履约和商家生态方向值得关注"],
  ["支付", "支付、风控和金融基础设施方向值得关注"],
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function cleanText(value, maxLength = 360) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength)}...`
}

function researchBody(observation, maxLength = 900) {
  const platform = observation?.platform
  let value = String(observation?.visibleText ?? "").replace(/\s+/g, " ").trim()

  if (platform === "xiaohongshu") {
    value = value.split("筛选 ").at(-1) ?? value
    value = value.replace(/^综合\s+/, "")
  }
  if (platform === "zhihu") {
    value = value.split("筛选 ").at(-1) ?? value
  }
  if (platform === "weibo") {
    value = value.replace(/^NEW\s+20\s+搜索结果\s+综合\s+智搜\s+实时\s+用户\s+视频\s+图片\s+话题\s+高级搜索\s*/, "")
  }
  if (/沪ICP备|营业执照|互联网药品信息服务资格证书|增值电信业务经营许可证|客户服务热线/.test(value)) {
    value = value.split(/全部 图文|筛选/).at(-1) ?? value
  }

  value = value
    .replace(/智搜回答.*?快速概览\(Qwen3·AI生成\)/g, "")
    .replace(/AI生成/g, "")
    .replace(/阅读全文​?/g, "")
    .replace(/展开c/g, "")
    .replace(/\s+/g, " ")
    .trim()

  return cleanText(value, maxLength)
}

function informativeText(observation, maxLength = 360) {
  const visibleText = researchBody(observation, maxLength)
  const title = cleanText(observation?.title, 160)
  const isBoilerplate =
    !visibleText ||
    visibleText === "加载中，请稍候" ||
    visibleText === "BOSS直聘" ||
    /沪ICP备|营业执照|互联网药品信息服务资格证书|增值电信业务经营许可证|客户服务热线/.test(
      visibleText
    )

  if (isBoilerplate) return title || "无可读摘要"
  return visibleText
}

function observationIsUsable(observation) {
  if (!observation || observation.access !== "ok") return false
  const companyName = observation.companyName ?? ""
  const body = researchBody(observation, 4000)
  if (body.length < 120 || (companyName && !body.includes(companyName))) return false
  if (/加载中，请稍候|BOSS直聘$/.test(body)) return false
  if (
    observation.platform === "xiaohongshu" &&
    /沪ICP备|营业执照|互联网药品信息服务资格证书|增值电信业务经营许可证/.test(body)
  ) return false
  if (
    observation.platform === "zhihu" &&
    body.length < 420 &&
    /关注 推荐 热榜|创作中心|综合用户论文/.test(body)
  ) return false
  return true
}

function bestObservationsByPlatform(observations) {
  const best = new Map()
  const rank = (item) => {
    const detailOk = (item.details ?? []).filter((detail) => detail.access === "ok").length
    return (
      (observationIsUsable(item) ? 100000 : 0) +
      (item.access === "ok" ? 10000 : 0) +
      detailOk * 1000 +
      researchBody(item, 4000).length
    )
  }

  for (const observation of observations) {
    const current = best.get(observation.platform)
    if (!current || rank(observation) > rank(current)) best.set(observation.platform, observation)
  }
  return [...best.values()]
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

async function readOptionalJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"))
  } catch (error) {
    if (error?.code === "ENOENT") return fallback
    throw error
  }
}

function groupBy(items, keyFn) {
  const groups = new Map()
  for (const item of items) {
    const key = keyFn(item)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  return groups
}

function keywordMatches(text, rules) {
  return unique(
    rules
      .filter(([keyword]) => text.includes(keyword))
      .map(([, value]) => value)
  )
}

function evidenceSnippets(observation, limit = 3) {
  if (!observationIsUsable(observation)) return []
  const body = researchBody(observation, 1400)
  if (!body || body === "加载中，请稍候" || body === "BOSS直聘") return []

  const pieces = body
    .split(/(?=热门 c| c [\u4e00-\u9fa5A-Za-z0-9_]+|\s\d{4}年|\s\d{2}-\d{2}|相关搜索)/)
    .map((item) => item.replace(/^热门 c\s*/, "").replace(/^c\s*/, "").trim())
    .filter((item) => item.length >= 18)

  const ranked = pieces.sort((a, b) => {
    const patterns = [/工作体验|面试|实习|offer|转正|年终奖|奖金|裁员|加班|强度|压力|离职|招聘|岗位|薪酬|待遇/]
    const score = (text) => patterns.filter((pattern) => pattern.test(text)).length
    return score(b) - score(a)
  })

  const companyName = observation.companyName ?? ""
  const relevant = ranked.filter((item) => !companyName || item.includes(companyName))
  return unique(relevant).slice(0, limit).map((item) => cleanText(item, 220))
}

function detailEvidenceSnippets(observation, limit = 3) {
  return unique(
    (observation.details ?? [])
      .filter((detail) => detail.access === "ok")
      .flatMap((detail) => {
        const body = researchBody(detail, 1400)
        const title = cleanText(detail.title || detail.sourceText, 120)
        if (!body || body === "加载中，请稍候") return []
        return [`${title}：${body}`]
      })
  )
    .slice(0, limit)
    .map((item) => cleanText(item, 260))
}

function basisFromObservations(observations, keywords, fallback) {
  if (keywords.includes("__readable_platforms__")) {
    const readable = observations
      .filter(observationIsUsable)
      .map((item) => `${platformLabels[item.platform] ?? item.platform}（${item.query || item.title || "已采集"}）`)
    return readable.length >= 2
      ? `已有 ${readable.length} 个可用平台：${readable.join("、")}。`
      : fallback
  }

  for (const observation of observations) {
    const allowBlocked = keywords.some((keyword) => ["登录", "验证码", "BOSS直聘"].includes(keyword))
    if (observation.access !== "ok" && !allowBlocked) continue
    for (const detail of observation.details ?? []) {
      if (detail.access !== "ok") continue
      const detailBody = `${detail.sourceText ?? ""} ${detail.title ?? ""} ${researchBody(detail, 1200)}`
      if (keywords.some((keyword) => detailBody.includes(keyword))) {
        return `${platformLabels[observation.platform] ?? observation.platform}详情页：${cleanText(detailBody, 200)}`
      }
    }
    const snippets = evidenceSnippets(observation, 8)
    const matching = snippets.find((snippet) => keywords.some((keyword) => snippet.includes(keyword)))
    if (matching) {
      return `${platformLabels[observation.platform] ?? observation.platform}：${cleanText(matching, 180)}`
    }
  }
  return fallback
}

function basisFromExternalEvidence(externalEvidence, signal) {
  const structured = externalEvidence.find((item) =>
    (item.signals ?? []).some((candidate) => candidate.signal === signal)
  )
  if (structured) {
    return {
      basis: `${structured.title}：${cleanText(structured.excerpt, 220)}`,
      sourceKind: "external",
      sourceUrl: structured.url,
      evidenceUsable: true,
    }
  }

  const keywords = signalKeywords(signal)
  const matching = externalEvidence.find((item) =>
    keywords.some((keyword) => `${item.title ?? ""} ${item.excerpt ?? ""}`.includes(keyword))
  )
  if (!matching) return null
  return {
    basis: `${matching.title}：${cleanText(matching.excerpt, 220)}`,
    sourceKind: "external",
    sourceUrl: matching.url,
    evidenceUsable: true,
  }
}

function signalKeywords(signal) {
  if (/AI|智能|算法/.test(signal)) return ["AI", "算法", "大模型"]
  if (/云计算|基础设施/.test(signal)) return ["云", "云计算"]
  if (/金融科技/.test(signal)) return ["金融科技", "银行", "支付"]
  if (/内容|社区/.test(signal)) return ["内容", "社区", "运营"]
  if (/电商|交易增长/.test(signal)) return ["电商", "交易"]
  if (/本地生活/.test(signal)) return ["本地生活", "美团"]
  if (/支付|风控/.test(signal)) return ["支付", "风控", "合规"]
  if (/多平台/.test(signal)) return ["__readable_platforms__"]
  if (/裁员|组织调整/.test(signal)) return ["裁员", "组织调整", "换血"]
  if (/奖金|绩效/.test(signal)) return ["奖金", "年终奖", "绩效"]
  if (/强度/.test(signal)) return ["强度", "高压", "搬砖", "生存"]
  if (/加班|节奏/.test(signal)) return ["加班", "晚上", "节奏", "工作体验"]
  if (/压力|考核/.test(signal)) return ["压力", "考核", "绩效"]
  if (/数据需要补采|招聘平台/.test(signal)) return ["登录", "验证码", "BOSS直聘"]
  return []
}

function enrichSignals(signals, observations, externalEvidence, fallbackPrefix) {
  return signals.map((signal) => {
    const external = basisFromExternalEvidence(externalEvidence, signal)
    if (external) return { signal, ...external }

    const fallback = `${fallbackPrefix}：当前没有可用证据，不能作为发布结论。`
    const basis = basisFromObservations(observations, signalKeywords(signal), fallback)
    const source = observations.find((item) =>
      basis.startsWith(`${platformLabels[item.platform] ?? item.platform}：`)
    )
    return {
      signal,
      basis,
      sourceKind: source ? "platform" : "none",
      sourcePlatform: source?.platform,
      sourceUrl: source?.finalUrl || source?.requestedUrl,
      evidenceUsable: basis !== fallback,
    }
  })
}

function baseDepartments(industry, researchText, externalEvidence) {
  const verifiedDepartments = externalEvidence.flatMap((item) => item.departments ?? [])
  const departments = keywordMatches(`${industry} ${researchText}`, departmentKeywordRules)
  if (/金融|银行|券商|保险|支付/.test(industry)) {
    departments.push("金融科技", "风控与合规")
  }
  if (/互联网|内容|电商|社区|本地生活/.test(industry)) {
    departments.push("研发与工程", "产品与设计", "运营与内容")
  }
  return unique([...verifiedDepartments, ...departments]).slice(0, 6)
}

function platformScore(observation) {
  if (!observation) return 0
  if (!observationIsUsable(observation)) return 0

  const text = `${observation.title ?? ""} ${informativeText(observation, 600)}`
  let score = 6.6
  if (/裁员|没有了|清零|维权|离职|压力|加班|强度/.test(text)) score -= 0.8
  if (/赞同 \d{3,}|评论|工作体验|面试/.test(text)) score += 0.2
  if (/招聘|岗位|金融科技|AI|算法|云|产品|运营/.test(text)) score += 0.4
  if (/登录|验证码|安全验证/.test(text)) score -= 1
  return Number(Math.max(0, Math.min(10, score)).toFixed(1))
}

function overallScore(companyObservations) {
  const scores = companyObservations
    .filter(observationIsUsable)
    .map(platformScore)
    .filter((score) => score > 0)
  if (scores.length === 0) return 0
  const weighted = scores.reduce((sum, score) => sum + score, 0) / scores.length
  const missingPenalty = companyObservations.filter((item) => item.access !== "ok").length * 0.25
  return Number(Math.max(0, weighted - missingPenalty).toFixed(1))
}

function recommendationTier(score, okCount) {
  if (okCount >= 4 && score >= 6.7) return "首批重点"
  if (okCount >= 3 && score >= 6.1) return "首批备选"
  return "继续观察"
}

function companyType(industry) {
  if (/银行|券商|保险|金融|支付/.test(industry)) return "金融与金融科技"
  if (/内容|社区/.test(industry)) return "内容社区"
  if (/电商/.test(industry)) return "电商与云计算"
  if (/本地生活/.test(industry)) return "本地生活平台"
  if (/游戏|云计算/.test(industry)) return "综合互联网平台"
  return "头部公司"
}

function createOneLine(target, departments) {
  const focus = departments.slice(0, 3).join("、") || "核心业务岗位"
  return `${target.name} 是${companyType(target.industry)}样本，当前公开信号适合从${focus}切入做求职研究。`
}

function tierBasis(observations, score, externalEvidence) {
  const usablePlatforms = observations
    .filter(observationIsUsable)
    .map((item) => platformLabels[item.platform] ?? item.platform)
  const weakPlatforms = observations
    .filter((item) => !observationIsUsable(item))
    .map((item) => platformLabels[item.platform] ?? item.platform)
  const strongSources = observations
    .filter(
      (item) =>
        item.access === "ok" &&
        (detailEvidenceSnippets(item, 1).length > 0 || evidenceSnippets(item, 1).length > 0)
    )
    .map((item) => platformLabels[item.platform] ?? item.platform)

  return [
    `情绪指数 ${score}/10。`,
    `可用平台：${usablePlatforms.join("、") || "无"}。`,
    weakPlatforms.length > 0 ? `薄弱或缺口平台：${weakPlatforms.join("、")}。` : "四个平台均有可用结果。",
    `证据较集中的平台：${unique(strongSources).join("、") || "暂无，需要补采" }。`,
    externalEvidence.length > 0 ? `外部校准源：${externalEvidence.length} 条。` : "外部校准源待补充。",
  ].join("")
}

function findEvidence(observations) {
  return observations.map((item) => ({
    platform: item.platform,
    access: item.access,
    query: item.query,
    title: item.title,
    url: item.finalUrl || item.requestedUrl,
    excerpt: informativeText(item, 260),
    screenshotPath: item.screenshotPath,
    evidenceUsable: observationIsUsable(item),
  }))
}

function platformFinding(observation) {
  const label = platformLabels[observation.platform] ?? observation.platform
  const detailSnippets = detailEvidenceSnippets(observation, 4)
  const snippets = detailSnippets.length > 0 ? detailSnippets : evidenceSnippets(observation, 3)
  const detailSummary = observation.detailSummary ?? {
    attempted: observation.details?.length ?? 0,
    ok: observation.details?.filter((item) => item.access === "ok").length ?? 0,
  }
  const usable = observationIsUsable(observation)
  const accessNote = usable
    ? "正文包含与公司直接相关的内容，可作为弱证据进入人工复核。"
    : "页面未形成与公司直接相关的可用正文，只能说明该平台仍需补采。"
  const limitation =
    observation.platform === "boss_zhipin" && snippets.length === 0
      ? "当前 Boss 只确认页面可达，未展开到岗位详情；部门和岗位判断仍需补采岗位列表。"
      : observation.platform === "xiaohongshu" && snippets.length === 0
        ? "小红书结果页受动态渲染影响，当前主要保留检索标题和截图，需人工打开截图复核具体笔记。"
        : "单个平台信号不直接构成事实结论，需要与其他平台交叉验证。"

  return {
    platform: observation.platform,
    label,
    access: observation.access,
    score: platformScore(observation),
    query: observation.query,
    url: observation.finalUrl || observation.requestedUrl,
    observation:
      snippets.length > 0
        ? snippets
        : [informativeText(observation, 220)],
    detailSummary,
    details: (observation.details ?? []).map((detail) => ({
      sourceText: detail.sourceText,
      access: detail.access,
      title: detail.title,
      url: detail.finalUrl || detail.requestedUrl,
      excerpt: informativeText(detail, 220),
      screenshotPath: detail.screenshotPath,
    })),
    supports: accessNote,
    limitation,
    screenshotPath: observation.screenshotPath,
  }
}

function platformSummary(observations) {
  return Object.fromEntries(
    observations.map((item) => [
      item.platform,
      {
        label: platformLabels[item.platform] ?? item.platform,
        access: item.access,
        score: platformScore(item),
        excerpt: informativeText(item, 180),
        evidenceUsable: observationIsUsable(item),
      },
    ])
  )
}

function normalizeExternalEvidence(items) {
  return items.map((item) => ({
    sourceType: item.sourceType ?? "external",
    title: item.title,
    url: item.url,
    excerpt: cleanText(item.excerpt, 260),
    collectedAt: item.collectedAt,
    confidence: item.confidence ?? (item.sourceType?.startsWith("official") ? "high" : "medium"),
    departments: item.departments ?? [],
    signals: item.signals ?? [],
  }))
}

function buildCard(target, observations, externalEvidence) {
  const bestObservations = bestObservationsByPlatform(observations)
  const usableObservations = bestObservations.filter(observationIsUsable)
  const platformEvidenceText = usableObservations.flatMap((item) => evidenceSnippets(item, 8)).join(" ")
  const externalText = externalEvidence.map((item) => `${item.title ?? ""} ${item.excerpt ?? ""}`).join(" ")
  const researchText = `${platformEvidenceText} ${externalText}`
  const usableCount = usableObservations.length
  const departments = baseDepartments(target.industry, researchText, externalEvidence)
  const score = overallScore(bestObservations)
  const opportunities = keywordMatches(researchText, opportunityKeywordRules)
  const structuredSignals = externalEvidence.flatMap((item) => item.signals ?? [])
  const verifiedOpportunities = structuredSignals
    .filter((item) => item.type === "opportunity")
    .map((item) => item.signal)
  const opportunitySignals = unique(
    verifiedOpportunities.length > 0 ? verifiedOpportunities : opportunities
  ).slice(0, 5)
  const riskSignals = unique(
    structuredSignals.filter((item) => item.type === "risk").map((item) => item.signal)
  ).slice(0, 5)

  return {
    name: target.name,
    city: target.city,
    industry: target.industry,
    generatedAt: today(),
    recommendationTier: recommendationTier(score, usableCount),
    recommendationBasis: tierBasis(bestObservations, score, externalEvidence),
    oneLine: createOneLine(target, departments),
    departments,
    sentiment: {
      score,
      sampleCount: observations.length,
      components: Object.fromEntries(
        bestObservations.map((item) => [item.platform, platformScore(item)])
      ),
      confidence: usableCount >= 3 ? "medium" : "low",
    },
    opportunitySignals,
    opportunityDetails: enrichSignals(opportunitySignals, observations, externalEvidence, "机会依据"),
    riskSignals,
    riskDetails: enrichSignals(riskSignals, observations, externalEvidence, "风险依据"),
    candidateAdvice:
      score >= 6.7
        ? "适合进入首批内容，但发布前需要人工核验岗位、组织和舆情线索。"
        : "建议先作为观察样本，补充更多岗位和员工体验证据后再进入首屏。",
    platformSummary: platformSummary(bestObservations),
    platformFindings: observations.map(platformFinding),
    externalEvidence: normalizeExternalEvidence(externalEvidence),
    evidence: findEvidence(observations),
    humanReviewFields: {
      companyProfile: "待人工确认",
      jobOpportunity: "待人工确认",
      mainRisks: "待人工确认",
      suitableCandidates: "待人工确认",
      publishDecision: "待人工确认",
    },
  }
}

const targets = JSON.parse(await readFile(targetsPath, "utf8"))
const observationsRaw = JSON.parse(await readFile(observationsPath, "utf8"))
const externalRaw = await readOptionalJson(externalPath, { evidence: [] })
const observations = observationsRaw.observations ?? []
const observationsByCompany = groupBy(observations, (item) => item.companyName)
const externalByCompany = groupBy(externalRaw.evidence ?? [], (item) => item.companyName)

const cards = (targets.companies ?? []).map((target) =>
  buildCard(
    target,
    observationsByCompany.get(target.name) ?? [],
    externalByCompany.get(target.name) ?? []
  )
)

const output = {
  generatedAt: today(),
  source: {
    targets: path.relative(appRoot, targetsPath),
    observations: path.relative(appRoot, observationsPath),
    externalEvidence: path.relative(appRoot, externalPath),
  },
  notes:
    "Draft company insight cards generated from public observations. Human review is required before product publication.",
  summary: {
    companies: cards.length,
    observations: observations.length,
    okObservations: observations.filter((item) => item.access === "ok").length,
    usableObservations: observations.filter(observationIsUsable).length,
    externalEvidence: (externalRaw.evidence ?? []).length,
    tiers: cards.reduce((summary, card) => {
      summary[card.recommendationTier] = (summary[card.recommendationTier] ?? 0) + 1
      return summary
    }, {}),
  },
  cards,
}

const reportLines = [
  "# 司南公司洞察卡片草稿",
  "",
  `生成日期：${today()}`,
  "",
  "这份文档是从公开 observation 生成的产品化草稿，不是最终事实结论。每张卡都需要人工复核后才能进入 App。",
  "",
  "## 总览",
  "",
  `- 公司数：${output.summary.companies}`,
  `- Observation 数：${output.summary.observations}`,
  `- 可读 Observation：${output.summary.okObservations}`,
  `- 可用 Observation：${output.summary.usableObservations}`,
  `- 外部校准证据：${output.summary.externalEvidence}`,
  `- 推荐分层：${Object.entries(output.summary.tiers).map(([tier, count]) => `${tier} ${count}`).join("；")}`,
  "",
]

for (const card of cards) {
  reportLines.push(`## ${card.name}`)
  reportLines.push("")
  reportLines.push(`- 城市/行业：${card.city} / ${card.industry}`)
  reportLines.push(`- 推荐分层：${card.recommendationTier}`)
  reportLines.push(`- 分层依据：${card.recommendationBasis}`)
  reportLines.push(`- 一句话画像：${card.oneLine}`)
  reportLines.push(`- 情绪指数：${card.sentiment.score} / 10，置信度：${card.sentiment.confidence}`)
  reportLines.push(`- 重点部门：${card.departments.join("、") || "待补充"}`)
  reportLines.push(`- 求职建议：${card.candidateAdvice}`)
  reportLines.push("")

  reportLines.push("### 机会判断")
  reportLines.push("")
  for (const item of card.opportunityDetails) {
    reportLines.push(`- ${item.signal}`)
    reportLines.push(`  - 依据：${item.basis}`)
    if (item.sourceUrl) reportLines.push(`  - 来源：${item.sourceUrl}`)
  }
  if (card.opportunityDetails.length === 0) {
    reportLines.push("- 待补充")
  }
  reportLines.push("")

  reportLines.push("### 风险判断")
  reportLines.push("")
  for (const item of card.riskDetails) {
    reportLines.push(`- ${item.signal}`)
    reportLines.push(`  - 依据：${item.basis}`)
    if (item.sourceUrl) reportLines.push(`  - 来源：${item.sourceUrl}`)
  }
  if (card.riskDetails.length === 0) {
    reportLines.push("- 待补充")
  }
  reportLines.push("")

  reportLines.push("### 平台观察")
  reportLines.push("")
  for (const finding of card.platformFindings) {
    reportLines.push(`- **${finding.label}**：${finding.access}，${finding.score}/10`)
    reportLines.push(`  - 检索词：${finding.query || "无"}`)
    if (finding.detailSummary.attempted > 0) {
      reportLines.push(
        `  - 二级详情：尝试 ${finding.detailSummary.attempted} 条，成功 ${finding.detailSummary.ok} 条`
      )
    }
    reportLines.push(`  - 支撑判断：${finding.supports}`)
    reportLines.push(`  - 局限：${finding.limitation}`)
    reportLines.push("  - 观察摘录：")
    for (const snippet of finding.observation) {
      reportLines.push(`    - ${snippet}`)
    }
    if (finding.details.length > 0) {
      reportLines.push("  - 详情页验证：")
      for (const detail of finding.details) {
        reportLines.push(`    - ${detail.access} · ${detail.title || detail.sourceText || "未命名详情"}`)
        reportLines.push(`      - 摘要：${detail.excerpt}`)
        if (detail.url) reportLines.push(`      - 来源：${detail.url}`)
        if (detail.screenshotPath) reportLines.push(`      - 截图：${detail.screenshotPath}`)
      }
    }
    if (finding.url) reportLines.push(`  - 来源：${finding.url}`)
    if (finding.screenshotPath) reportLines.push(`  - 截图：${finding.screenshotPath}`)
  }
  reportLines.push("")

  reportLines.push("### 外部校准证据")
  reportLines.push("")
  if (card.externalEvidence.length === 0) {
    reportLines.push("- 待补充")
  }
  for (const item of card.externalEvidence) {
    reportLines.push(`- ${item.title}（${item.sourceType}，置信度：${item.confidence}）`)
    reportLines.push(`  - 摘要：${item.excerpt}`)
    if (item.url) reportLines.push(`  - 来源：${item.url}`)
  }
  reportLines.push("")
}

await mkdir(path.dirname(outputPath), { recursive: true })
await mkdir(path.dirname(reportPath), { recursive: true })
await writeFile(outputPath, JSON.stringify(output, null, 2) + "\n", "utf8")
await writeFile(reportPath, reportLines.join("\n"), "utf8")

console.log(
  `Wrote ${path.relative(appRoot, outputPath)} and ${path.relative(appRoot, reportPath)} from ${cards.length} companies`
)
