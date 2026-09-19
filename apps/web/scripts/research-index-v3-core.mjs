import { createHash } from "node:crypto"

export const MODEL_VERSION = "sinan-index-v3"
export const DEFAULT_DATA_AS_OF = new Date().toISOString().slice(0, 10)

export const CORE_DEFINITIONS = {
  opportunity: {
    label: "职业机会指数",
    weight: 0.25,
    highMeans: "岗位方向和可验证机会更多",
    positive: [/招聘/, /岗位/, /校招/, /社招/, /实习/, /开放/, /扩招/, /人才/, /AI/, /算法/, /研发/, /产品/, /商业化/],
    negative: [/招聘冻结/, /HC冻结/, /停止招聘/, /岗位减少/, /缩招/, /业务收缩/],
  },
  growth: {
    label: "成长动能指数",
    weight: 0.2,
    highMeans: "业务、技术投入和成长方向更清晰",
    positive: [/增长/, /投入/, /扩张/, /新增/, /AI/, /人工智能/, /大模型/, /云/, /科技/, /研发/, /晋升/, /成长/, /全球业务/],
    negative: [/业务下线/, /收缩/, /冻结/, /晋升难/, /发展受限/, /降本增效/],
  },
  workplace: {
    label: "工作体验指数",
    weight: 0.2,
    highMeans: "公开工作体验信号更偏正向",
    positive: [/双休/, /福利/, /氛围好/, /体验好/, /不打卡/, /调休/, /晋升/, /成长/, /协作/, /食堂/, /下午茶/],
    negative: [/加班/, /996/, /大小周/, /单休/, /压力大/, /强度大/, /内耗/, /离职/, /PIP/, /绩效淘汰/],
  },
  compensationTransparency: {
    label: "薪酬透明指数",
    weight: 0.15,
    highMeans: "薪酬、奖金、职级和兑现口径更容易核验",
    positive: [/薪资/, /薪酬/, /工资/, /奖金/, /年终奖/, /职级/, /调薪/, /期权/, /股票/, /薪酬结构/, /岗位薪资/],
    negative: [/薪资不透明/, /口径不一/, /不兑现/, /奖金缩水/, /年终奖清零/, /薪资陷阱/, /承诺未兑现/],
  },
  stability: {
    label: "稳定性指数",
    weight: 0.2,
    highMeans: "经营、招聘和组织信号更稳定",
    positive: [/员工增加/, /员工增长/, /净增/, /增员/, /扩招/, /收入增长/, /营收增长/, /长期/, /稳定/, /持续招聘/],
    negative: [/裁员/, /人员优化/, /组织优化/, /末位淘汰/, /绩效淘汰/, /HC冻结/, /招聘冻结/, /PIP/, /降本增效/, /减员/, /业务收缩/],
  },
}

export const FUN_DEFINITIONS = {
  afternoonTea: {
    label: "下午茶续命指数",
    highMeans: "茶歇、零食与饮品供给更丰富",
    halfLifeDays: 180,
    positive: [/下午茶/, /茶水间/, /零食/, /零食柜/, /水果/, /咖啡/, /酸奶/, /饮品/, /奶茶/],
    negative: [/取消.{0,8}下午茶/, /不再提供.{0,8}下午茶/, /福利缩水/, /零食取消/],
  },
  canteen: {
    label: "食堂幸福指数",
    highMeans: "餐饮供给和补贴体验更好",
    halfLifeDays: 180,
    positive: [/免费三餐/, /免费.{0,5}(早餐|午餐|晚餐)/, /食堂.{0,12}(丰富|好吃|免费|补贴)/, /员工餐/, /餐补/, /夜宵/],
    negative: [/没有食堂/, /食堂.{0,10}(难吃|涨价|缩水)/, /餐补取消/, /夜宵取消/],
  },
  overtime: {
    label: "加班浓度",
    highMeans: "延时、周末或高强度工作信号更多",
    highIsRisk: true,
    halfLifeDays: 180,
    positive: [/加班到(深夜|凌晨)/, /长期加班/, /经常加班/, /周末加班/, /很少准点下班/, /996/, /大小周/, /单休/, /工作强度.{0,5}(大|高)/],
    negative: [/不加班/, /很少加班/, /准点下班/, /取消大小周/, /加班需.{0,6}(申请|审批)/],
  },
  weekend: {
    label: "双休可信度",
    highMeans: "双休制度及实际休息证据更强",
    halfLifeDays: 180,
    positive: [/全员双休/, /取消大小周/, /统一双休/, /周末双休/, /加班需.{0,6}(申请|审批)/, /周末不加班/],
    negative: [/周末加班/, /大小周/, /单休/, /周六.{0,4}(上班|值班)/, /周日.{0,4}(上班|值班)/],
  },
  layoffAnxiety: {
    label: "裁员恐慌度",
    highMeans: "组织收缩、优化或淘汰压力信号更多",
    highIsRisk: true,
    halfLifeDays: 270,
    positive: [/裁员/, /人员优化/, /组织优化/, /末位淘汰/, /绩效淘汰/, /HC冻结/, /招聘冻结/, /PIP/, /降本增效/, /减员/],
    negative: [/员工.{0,8}(增加|增长|净增)/, /增员/, /扩招/, /裁员.{0,8}(不实|否认)/, /开放.{0,8}岗位/, /招聘.{0,8}(启动|进行)/],
  },
}

const SOURCE_WEIGHTS = {
  official: 1,
  recruitment: 0.8,
  media: 0.8,
  platform_detail: 0.6,
  internal_verified: 1,
  internal_review: 0.7,
  platform_search: 0.3,
  derived: 0.25,
}

const CONFIDENCE_WEIGHTS = { high: 1, medium: 0.7, low: 0.4 }
const PLATFORM_NAMES = new Set(["boss_zhipin", "xiaohongshu", "weibo", "zhihu"])

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value))
const round = (value, digits = 1) => Number(Number(value).toFixed(digits))

export function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim()
}

export function canonicalizeUrl(value) {
  const raw = String(value ?? "").trim()
  if (!raw) return ""
  try {
    const url = new URL(raw)
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|from|refer|spm|source|share|scene)/i.test(key)) url.searchParams.delete(key)
    }
    url.hash = ""
    return url.toString().replace(/\/$/, "")
  } catch {
    return raw.split(/[?#]/, 1)[0]
  }
}

export function textHash(value) {
  return createHash("sha256")
    .update(normalizeText(value).toLowerCase())
    .digest("hex")
    .slice(0, 32)
}

export function freshnessWeight(publishedAt, dataAsOf, halfLifeDays) {
  const date = String(publishedAt ?? "").slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 0.45
  const published = new Date(`${date}T00:00:00.000Z`)
  const asOf = new Date(`${String(dataAsOf).slice(0, 10)}T00:00:00.000Z`)
  if (Number.isNaN(published.valueOf()) || Number.isNaN(asOf.valueOf())) return 0.45
  const ageDays = Math.max(0, (asOf - published) / 86_400_000)
  return round(Math.max(0.05, Math.min(1, 0.5 ** (ageDays / halfLifeDays))), 4)
}

function bodyForObservation(item) {
  let body = normalizeText(item.visibleText)
  if (item.platform === "zhihu" || item.platform === "xiaohongshu") body = body.split("筛选 ").at(-1) ?? body
  if (item.platform === "weibo") body = body.replace(/^NEW\s+\d+\s+搜索结果.*?高级搜索\s*/, "")
  return body
}

function isUsableObservation(item) {
  const body = bodyForObservation(item)
  if (item.access !== "ok" || body.length < 120 || !body.includes(item.companyName)) return false
  if (item.platform === "xiaohongshu" && /沪ICP备|营业执照/.test(body)) return false
  if (item.platform === "zhihu" && body.length < 300) return false
  return true
}

function sourceWeightFor({ kind, sourceType, confidence }) {
  if (kind === "internal_verified") return SOURCE_WEIGHTS.internal_verified
  if (kind === "internal_review") return SOURCE_WEIGHTS.internal_review
  if (kind === "theme") return CONFIDENCE_WEIGHTS[confidence] ?? SOURCE_WEIGHTS.derived
  if (/official|annual|filing|financial|esg/i.test(String(sourceType))) return SOURCE_WEIGHTS.official
  if (/career|recruit|job/i.test(String(sourceType))) return SOURCE_WEIGHTS.recruitment
  if (/media|report|analysis/i.test(String(sourceType))) return SOURCE_WEIGHTS.media
  if (kind === "platform_detail") return SOURCE_WEIGHTS.platform_detail
  if (kind === "platform_search") return SOURCE_WEIGHTS.platform_search
  return SOURCE_WEIGHTS.derived
}

function effectFromPatterns(text, definition) {
  const positive = definition.positive.filter((pattern) => pattern.test(text)).length
  const negative = definition.negative.filter((pattern) => pattern.test(text)).length
  if (!positive && !negative) return null
  const net = positive - negative
  if (net === 0) return 0
  return Math.max(-1, Math.min(1, Math.sign(net) * Math.min(1, 0.3 + Math.abs(net) * 0.16)))
}

function cityFromText(text, target) {
  if (target?.city && text.includes(target.city)) return target.city
  return undefined
}

function scopeFromText(text, target, explicit = {}) {
  const city = explicit.city ?? cityFromText(text, target)
  const departmentName = explicit.departmentName
  const jobFamily = explicit.jobFamily
  if (departmentName) return { scopeType: "department", scopeKey: departmentName, departmentName, city, jobFamily }
  if (jobFamily) return { scopeType: "job_family", scopeKey: jobFamily, city, jobFamily }
  if (city) return { scopeType: "city", scopeKey: city, city }
  return { scopeType: "company", scopeKey: "company" }
}

function baseSignal({
  companyName,
  indexKey,
  effect,
  title,
  text,
  url,
  sourceKind,
  sourceType,
  platform,
  publishedAt,
  collectedAt,
  dataAsOf,
  target,
  confidence,
  explicitScope,
  trustWeight = 1,
}) {
  const normalized = normalizeText(text)
  const canonicalUrl = canonicalizeUrl(url)
  const scope = scopeFromText(normalized, target, explicitScope)
  const isSearch = sourceKind === "platform_search"
  const evidenceHash = textHash(`${companyName}|${indexKey}|${normalized.slice(0, 1800)}`)
  const sourceClusterKey = sourceKind === "platform_search"
    ? `platform-search:${platform || sourceType || "unknown"}`
    : (canonicalUrl || evidenceHash)
  const sourceWeight = sourceWeightFor({ kind: sourceKind, sourceType, confidence })
  const relevanceWeight = isSearch ? 0.75 : 1
  const halfLifeDays = FUN_DEFINITIONS[indexKey]?.halfLifeDays ?? (
    indexKey === "stability" ? 730 : 365
  )
  return {
    id: textHash(`${companyName}|${indexKey}|${sourceKind}|${sourceClusterKey}|${evidenceHash}`),
    companyName,
    indexKey,
    effect: round(effect, 4),
    sourceKind,
    sourceType: sourceType || sourceKind,
    platform: PLATFORM_NAMES.has(platform) ? platform : undefined,
    sourceUrl: canonicalUrl || undefined,
    title: normalizeText(title) || "未命名证据",
    excerpt: normalized.slice(0, 1000),
    publishedAt: String(publishedAt ?? "").slice(0, 10) || undefined,
    collectedAt: String(collectedAt ?? "").slice(0, 30) || undefined,
    sourceWeight: round(sourceWeight, 4),
    freshnessWeight: freshnessWeight(publishedAt, dataAsOf, halfLifeDays),
    relevanceWeight,
    trustWeight,
    evidenceHash,
    clusterKey: sourceClusterKey,
    sourceClusterKey,
    contentClusterKey: `content:${evidenceHash}`,
    ...scope,
  }
}

function signalsFromText({ companyName, text, title, url, sourceKind, sourceType, platform, publishedAt, collectedAt, target, dataAsOf, confidence, explicitScope, trustWeight }) {
  const normalized = normalizeText(text)
  if (!normalized) return []
  const output = []
  for (const [indexKey, definition] of Object.entries({ ...CORE_DEFINITIONS, ...FUN_DEFINITIONS })) {
    const effect = effectFromPatterns(normalized, definition)
    if (effect === null) continue
    output.push(baseSignal({
      companyName,
      indexKey,
      effect,
      title,
      text: normalized,
      url,
      sourceKind,
      sourceType,
      platform,
      publishedAt,
      collectedAt,
      dataAsOf,
      target,
      confidence,
      explicitScope,
      trustWeight,
    }))
  }
  return output
}

function signalsFromThemeEvidence(item, target, dataAsOf) {
  const output = []
  for (const [indexKey, effect] of Object.entries(item.effects ?? {})) {
    if (!Object.hasOwn(FUN_DEFINITIONS, indexKey) || !Number.isFinite(Number(effect))) continue
    output.push(baseSignal({
      companyName: item.companyName,
      indexKey,
      effect: Number(effect),
      title: item.title,
      text: `${item.title} ${item.excerpt ?? ""}`,
      url: item.url,
      sourceKind: "theme",
      sourceType: item.sourceType,
      publishedAt: item.publishedAt,
      collectedAt: item.collectedAt,
      dataAsOf,
      target,
      confidence: item.confidence,
      trustWeight: 1,
    }))
  }
  return output
}

function reviewSignals(review, target, dataAsOf) {
  if (!review.companyName) return []
  const base = {
    companyName: review.companyName,
    title: review.title || "Sinan 站内评价",
    text: `${review.title ?? ""} ${review.content ?? ""}`,
    url: review.sourceUrl,
    sourceKind: review.verified ? "internal_verified" : "internal_review",
    sourceType: "sinan_review",
    publishedAt: review.createdAt,
    collectedAt: review.createdAt,
    dataAsOf,
    target,
    explicitScope: {
      departmentName: review.departmentName,
      city: review.city,
      jobFamily: review.jobFamily,
    },
    trustWeight: review.verified ? 1 : 0.85,
  }
  const output = signalsFromText(base)
  const questionnaire = review.questionnaire ?? {}
  const addScore = (indexKey, score, direction = 1) => {
    if (!Number.isFinite(Number(score))) return
    const normalized = Math.max(-1, Math.min(1, (Number(score) - 5.5) / 4.5)) * direction
    output.push(baseSignal({ ...base, indexKey, effect: normalized }))
  }
  addScore("workplace", questionnaire.workLifeBalanceScore)
  addScore("workplace", questionnaire.overallOfficeExperienceScore)
  addScore("afternoonTea", questionnaire.afternoonTeaScore)
  addScore("canteen", questionnaire.canteenScore)
  addScore("overtime", questionnaire.overtimeScore, 1)
  const overtimeLevelScores = { very_high: 9, high: 8, normal: 5, low: 2 }
  addScore("overtime", overtimeLevelScores[questionnaire.overtimeLevel])
  addScore("weekend", questionnaire.workLifeBalanceScore)
  addScore("stability", questionnaire.stabilityScore)
  return output
}

export function normalizeEvidence({ targets, observations = [], externalEvidence = [], themeEvidence = [], internalReviews = [], dataAsOf = DEFAULT_DATA_AS_OF }) {
  const targetByName = new Map(targets.map((item) => [item.name, item]))
  const signals = []
  for (const item of observations) {
    const target = targetByName.get(item.companyName)
    if (!target || !isUsableObservation(item)) continue
    const body = bodyForObservation(item)
    signals.push(...signalsFromText({
      companyName: item.companyName,
      text: body,
      title: item.title || item.query,
      url: item.finalUrl || item.requestedUrl,
      sourceKind: "platform_search",
      sourceType: item.platform,
      platform: item.platform,
      publishedAt: item.latestPublishedDate,
      collectedAt: item.collectedAt,
      target,
      dataAsOf,
    }))
    for (const detail of item.details ?? []) {
      const detailText = normalizeText(`${detail.sourceText ?? ""} ${detail.title ?? ""} ${detail.visibleText ?? ""}`)
      if (detail.access !== "ok" || !detailText.includes(item.companyName)) continue
      signals.push(...signalsFromText({
        companyName: item.companyName,
        text: detailText,
        title: detail.title || detail.sourceText || item.title || item.query,
        url: detail.finalUrl || detail.requestedUrl,
        sourceKind: "platform_detail",
        sourceType: item.platform,
        platform: item.platform,
        publishedAt: detail.publishedAt || item.latestPublishedDate,
        collectedAt: item.collectedAt,
        target,
        dataAsOf,
      }))
    }
  }
  for (const item of externalEvidence) {
    const target = targetByName.get(item.companyName)
    if (!target) continue
    signals.push(...signalsFromText({
      companyName: item.companyName,
      text: `${item.title ?? ""} ${item.excerpt ?? ""}`,
      title: item.title,
      url: item.url,
      sourceKind: /official|financial|annual|filing/i.test(item.sourceType ?? "") ? "official" : "media",
      sourceType: item.sourceType,
      publishedAt: item.publishedAt,
      collectedAt: item.collectedAt,
      target,
      dataAsOf,
      confidence: item.confidence,
    }))
  }
  for (const item of themeEvidence) {
    const target = targetByName.get(item.companyName)
    if (target) signals.push(...signalsFromThemeEvidence(item, target, dataAsOf))
  }
  for (const review of internalReviews) {
    const target = targetByName.get(review.companyName)
    if (target && ["visible", "limited_visible", "approved", undefined].includes(review.status)) {
      signals.push(...reviewSignals(review, target, dataAsOf))
    }
  }
  return dedupeSignals(signals)
}

function dedupeSignals(signals) {
  const selected = new Map()
  for (const signal of signals) {
    const sourceKey = `${signal.companyName}|${signal.indexKey}|${signal.sourceClusterKey}|${signal.scopeType}|${signal.scopeKey}`
    const contentKey = `${signal.companyName}|${signal.indexKey}|${signal.contentClusterKey}|${signal.scopeType}|${signal.scopeKey}`
    const duplicates = [...selected.values()].filter((item) => {
      const itemSourceKey = `${item.companyName}|${item.indexKey}|${item.sourceClusterKey}|${item.scopeType}|${item.scopeKey}`
      const itemContentKey = `${item.companyName}|${item.indexKey}|${item.contentClusterKey}|${item.scopeType}|${item.scopeKey}`
      return itemSourceKey === sourceKey || itemContentKey === contentKey
    })
    if (!duplicates.length) {
      selected.set(signal.id, signal)
      continue
    }
    const best = [signal, ...duplicates].sort((left, right) =>
      right.sourceWeight * right.freshnessWeight - left.sourceWeight * left.freshnessWeight
    )[0]
    for (const duplicate of duplicates) selected.delete(duplicate.id)
    selected.set(best.id, best)
  }
  return [...selected.values()]
}

function capIndependence(signals) {
  const baseTotal = signals.reduce((sum, item) => sum + item.sourceWeight * item.freshnessWeight * item.relevanceWeight * item.trustWeight, 0)
  const byCluster = new Map()
  for (const item of signals) {
    const key = `${item.clusterKey}|${item.indexKey}`
    byCluster.set(key, (byCluster.get(key) ?? 0) + item.sourceWeight * item.freshnessWeight * item.relevanceWeight * item.trustWeight)
  }
  return signals.map((item) => {
    const clusterTotal = byCluster.get(`${item.clusterKey}|${item.indexKey}`) ?? 0
    const independenceWeight = clusterTotal > 0 ? Math.min(1, (baseTotal * 0.25) / clusterTotal) : 1
    return { ...item, independenceWeight: round(independenceWeight, 4) }
  })
}

export function scoreSignals(inputSignals, { fallbackScore = 50, dataAsOf = DEFAULT_DATA_AS_OF } = {}) {
  const signals = capIndependence(inputSignals)
  if (!signals.length) {
    return {
      score: round(fallbackScore),
      rawScore: round(fallbackScore),
      confidence: 0,
      effectiveSampleSize: 0,
      sourceCount: 0,
      evidenceCount: 0,
      reasons: ["暂未找到可用的指数证据"],
      limitations: ["没有可用证据，分数保持中性值 50"],
      evidenceRefs: [],
      dataAsOf,
    }
  }
  const weightedSignals = signals.map((item) => ({
    ...item,
    weight: item.sourceWeight * item.freshnessWeight * item.independenceWeight * item.relevanceWeight * item.trustWeight,
  }))
  const weightTotal = weightedSignals.reduce((sum, item) => sum + item.weight, 0)
  const weightedEffect = weightedSignals.reduce((sum, item) => sum + item.effect * item.weight, 0) / Math.max(weightTotal, 0.0001)
  const rawScore = clamp(50 + weightedEffect * 50)
  const clusterWeights = new Map()
  for (const item of weightedSignals) {
    clusterWeights.set(item.clusterKey, (clusterWeights.get(item.clusterKey) ?? 0) + item.weight)
  }
  const squaredWeightTotal = [...clusterWeights.values()].reduce((sum, weight) => sum + weight ** 2, 0)
  const effectiveSampleSize = squaredWeightTotal ? weightTotal ** 2 / squaredWeightTotal : 0
  const sourceCount = clusterWeights.size
  const platformCount = new Set(weightedSignals.map((item) => item.platform).filter(Boolean)).size
  const freshness = weightedSignals.reduce((sum, item) => sum + item.freshnessWeight * item.weight, 0) / Math.max(weightTotal, 0.0001)
  const confidence = clamp(
    Math.min(65, (effectiveSampleSize / 8) * 65) +
      Math.min(15, (sourceCount / 4) * 15) +
      Math.min(10, (platformCount / 3) * 10) +
      freshness * 10
  )
  const score = 50 + (rawScore - 50) * confidence / 100
  const contribution = [...weightedSignals].sort((a, b) => Math.abs(b.effect * b.weight) - Math.abs(a.effect * a.weight))
  const reasons = contribution.slice(0, 4).map((item) => item.title).filter(Boolean)
  const limitations = []
  if (confidence < 30) limitations.push("证据稀薄，结果不适合进入横向排行榜")
  if (sourceCount < 2) limitations.push("目前主要依赖单一来源或同源内容")
  if (weightedSignals.some((item) => item.freshnessWeight === 0.45)) limitations.push("部分证据没有发布日期，时效性按上限折扣处理")
  if (weightedSignals.some((item) => item.effect > 0) && weightedSignals.some((item) => item.effect < 0)) limitations.push("存在方向相反的公开信号，需结合部门、城市和年份复核")
  limitations.push("公司级公开证据不代表每个园区、部门和岗位")
  return {
    score: round(score),
    rawScore: round(rawScore),
    confidence: round(confidence),
    effectiveSampleSize: round(effectiveSampleSize, 2),
    sourceCount,
    evidenceCount: weightedSignals.length,
    reasons,
    limitations: [...new Set(limitations)],
    evidenceRefs: weightedSignals.map((item) => ({
      evidenceId: item.id,
      sourceKind: item.sourceKind,
      sourceKey: item.clusterKey,
      title: item.title,
      url: item.sourceUrl,
      effect: round(item.effect, 4),
      weight: round(item.weight, 4),
      freshnessWeight: item.freshnessWeight,
      independenceWeight: item.independenceWeight,
    })),
    dataAsOf,
  }
}

function aggregateByScope(signals, companyScore, indexKey, dataAsOf) {
  const groups = new Map()
  for (const signal of signals) {
    if (signal.scopeType === "company") continue
    const key = `${signal.scopeType}|${signal.scopeKey}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(signal)
  }
  const slices = []
  for (const [key, items] of groups) {
    const scored = scoreSignals(items, { fallbackScore: companyScore.score, dataAsOf })
    if (scored.effectiveSampleSize < 3 || scored.sourceCount < 2) continue
    const shrinkage = Math.min(1, scored.effectiveSampleSize / 8)
    const score = companyScore.score + (scored.score - companyScore.score) * shrinkage
    const [scopeType, scopeKey] = key.split("|")
    slices.push({
      scopeType,
      scopeKey,
      indexKey,
      score: round(score),
      rawScore: scored.rawScore,
      confidence: scored.confidence,
      effectiveSampleSize: scored.effectiveSampleSize,
      sourceCount: scored.sourceCount,
      evidenceCount: scored.evidenceCount,
      reasons: scored.reasons,
      limitations: [...scored.limitations, `已按公司级分数进行 ${(1 - shrinkage) * 100 | 0}% 分层收缩`],
      evidenceRefs: scored.evidenceRefs,
      dataAsOf,
    })
  }
  return slices
}

function funTag(funIndices) {
  const parts = []
  if ((funIndices.afternoonTea?.confidence ?? 0) >= 30 && funIndices.afternoonTea.score >= 57) parts.push("茶水间有盼头")
  if ((funIndices.canteen?.confidence ?? 0) >= 30 && funIndices.canteen.score >= 57) parts.push("食堂能打")
  if ((funIndices.overtime?.confidence ?? 0) >= 30 && funIndices.overtime.score >= 57) parts.push("夜色浓度偏高")
  if ((funIndices.weekend?.confidence ?? 0) >= 30 && funIndices.weekend.score >= 57) parts.push("周末相对可信")
  if ((funIndices.layoffAnxiety?.confidence ?? 0) >= 30 && funIndices.layoffAnxiety.score >= 57) parts.push("组织风声偏紧")
  return parts.length ? parts.slice(0, 2).join("，") : "体感证据不足，先别急着贴标签"
}

export function buildIndexDocument({ targets, observations = [], externalEvidence = [], themeEvidence = [], internalReviews = [], dataAsOf = DEFAULT_DATA_AS_OF }) {
  const signals = normalizeEvidence({ targets, observations, externalEvidence, themeEvidence, internalReviews, dataAsOf })
  const companies = targets.map((target) => {
    const companySignals = signals.filter((item) => item.companyName === target.name)
    const components = Object.fromEntries(Object.entries(CORE_DEFINITIONS).map(([indexKey]) => [
      indexKey,
      scoreSignals(companySignals.filter((item) => item.indexKey === indexKey && item.scopeType === "company"), { dataAsOf }),
    ]))
    const funIndices = Object.fromEntries(Object.entries(FUN_DEFINITIONS).map(([indexKey]) => [
      indexKey,
      scoreSignals(companySignals.filter((item) => item.indexKey === indexKey && item.scopeType === "company"), { dataAsOf }),
    ]))
    const rawOverallScore = Object.entries(CORE_DEFINITIONS).reduce((sum, [key, definition]) => sum + components[key].score * definition.weight, 0)
    const confidence = round(Object.entries(CORE_DEFINITIONS).reduce((sum, [key, definition]) => sum + components[key].confidence * definition.weight, 0))
    const overallScore = confidence < 30 ? null : round(50 + (rawOverallScore - 50) * confidence / 100)
    const slices = Object.entries(CORE_DEFINITIONS)
      .flatMap(([indexKey]) => aggregateByScope(companySignals.filter((item) => item.indexKey === indexKey), components[indexKey], indexKey, dataAsOf))
      .concat(Object.entries(FUN_DEFINITIONS).flatMap(([indexKey]) => aggregateByScope(companySignals.filter((item) => item.indexKey === indexKey), funIndices[indexKey], indexKey, dataAsOf)))
    return {
      name: target.name,
      city: target.city,
      industry: target.industry,
      overallScore,
      rawOverallScore: round(rawOverallScore),
      confidence,
      modelVersion: MODEL_VERSION,
      dataAsOf,
      components,
      funTag: funTag(funIndices),
      funIndices,
      slices,
    }
  })
  return {
    generatedAt: new Date().toISOString(),
    dataAsOf,
    modelVersion: MODEL_VERSION,
    scale: "0-100",
    methodology: {
      weights: Object.fromEntries(Object.entries(CORE_DEFINITIONS).map(([key, item]) => [key, item.weight])),
      confidenceAdjustment: "displayScore = 50 + (rawScore - 50) * confidence / 100",
      effectiveSampleSize: "nEff = (sum(weight)^2) / sum(weight^2)",
      freshness: "0.5 ^ (ageDays / halfLifeDays); missing publication dates are capped at 0.45",
      independenceCap: "one URL, author, or repost cluster contributes at most 25% of the index weight",
      funIndexDirections: Object.fromEntries(Object.entries(FUN_DEFINITIONS).map(([key, item]) => [key, item.highMeans])),
      note: "指数是可回溯的公司级公开证据体感，不代表每个园区、部门或员工；置信度低于30的公司不进入横向排行榜。",
    },
    sourceCounts: {
      observations: observations.length,
      externalEvidence: externalEvidence.length,
      themeEvidence: themeEvidence.length,
      internalReviews: internalReviews.length,
      normalizedSignals: signals.length,
    },
    companies,
    evidenceSignals: signals,
  }
}
