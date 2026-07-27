import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")

const inputArg = process.argv.find((arg) => arg.startsWith("--input="))
const outputArg = process.argv.find((arg) => arg.startsWith("--output="))

const inputPath = path.resolve(
  appRoot,
  inputArg?.slice("--input=".length) ?? "src/db/seeds/research-observations.json"
)
const outputPath = path.resolve(
  appRoot,
  outputArg?.slice("--output=".length) ?? "src/db/seeds/reports/company-research-report.md"
)

function today() {
  return new Date().toISOString().slice(0, 10)
}

function text(value) {
  return String(value ?? "").trim()
}

function excerpt(value, maxLength = 420) {
  const normalized = text(value).replace(/\s+/g, " ")
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength)}...`
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

function accessLabel(access) {
  return {
    ok: "可读",
    login_required: "需登录",
    verification_required: "需验证",
    limited_or_failed: "受限/失败",
    unsupported_platform: "不支持",
  }[access] ?? access
}

function platformLine(observation) {
  const parts = [
    `**${observation.platform}**`,
    accessLabel(observation.access),
    observation.status ? `HTTP ${observation.status}` : null,
    observation.finalUrl ? `[页面](${observation.finalUrl})` : null,
  ].filter(Boolean)
  return `- ${parts.join(" · ")}`
}

function topLinks(observation) {
  return (observation.links ?? [])
    .slice(0, 5)
    .map((link) => `  - [${text(link.text).slice(0, 48)}](${link.href})`)
}

const raw = JSON.parse(await readFile(inputPath, "utf8"))
const observations = raw.observations ?? []

if (observations.length === 0) {
  throw new Error(`No observations found in ${path.relative(appRoot, inputPath)}`)
}

const byCompany = groupBy(observations, (item) => item.companyName ?? "未知公司")
const lines = [
  `# 司南头部公司研究报告草稿`,
  "",
  `生成日期：${today()}`,
  "",
  "## 1. 研究目的",
  "",
  "本报告用于沉淀司南 App 启动阶段的公司判断框架。当前版本是基于公开页面 observation 的研报草稿，不等同于数据库 seed，也不直接作为事实结论发布。",
  "",
  "## 2. 方法与边界",
  "",
  "- 覆盖平台：Boss 直聘、小红书、微博、知乎。",
  "- 采集方式：Playwright 打开公开页面或登录后可见页面，记录页面标题、链接、可见文本摘要和访问状态。",
  "- 使用边界：不绕过登录、验证码、付费墙或平台访问限制；不保存手机号、微信号、身份证号等个人敏感信息。",
  "- 报告口径：单条帖子或单个平台信号只作为线索，正式结论需要人工复核和交叉验证。",
  "",
  "## 3. 总览",
  "",
  `- 公司数：${byCompany.size}`,
  `- Observation 数：${observations.length}`,
  `- 可读页面：${observations.filter((item) => item.access === "ok").length}`,
  `- 需登录页面：${observations.filter((item) => item.access === "login_required").length}`,
  `- 需验证/受限页面：${observations.filter((item) => ["verification_required", "limited_or_failed"].includes(item.access)).length}`,
  "",
  "## 4. 初步发现",
  "",
  "- 待填写：互联网头部公司的招聘方向、组织节奏、管理风格和候选人风险。",
  "- 待填写：金融头部公司的金融科技岗位、校招/社招特点、薪酬稳定性和合规流程压力。",
  "- 待填写：哪些公司适合进入司南 App 首屏或第一批专题。",
  "",
  "## 5. 公司观察",
  "",
]

for (const [companyName, companyObservations] of byCompany) {
  lines.push(`### ${companyName}`, "")
  lines.push("**人工结论**")
  lines.push("")
  lines.push("- 公司画像：待填写")
  lines.push("- 求职机会：待填写")
  lines.push("- 主要风险：待填写")
  lines.push("- 适合人群：待填写")
  lines.push("- 是否进入 App 首批内容：待填写")
  lines.push("")
  lines.push("**平台观察**")
  lines.push("")

  for (const observation of companyObservations) {
    lines.push(platformLine(observation))
    if (observation.query) lines.push(`  - 检索词：${observation.query}`)
    if (observation.title) lines.push(`  - 标题：${observation.title}`)
    if (observation.nextAction) lines.push(`  - 下一步：${observation.nextAction}`)
    if (observation.visibleText) lines.push(`  - 摘要：${excerpt(observation.visibleText)}`)
    const links = topLinks(observation)
    if (links.length > 0) {
      lines.push("  - 可见链接：")
      lines.push(...links)
    }
    if (observation.screenshotPath) {
      lines.push(`  - 截图：${observation.screenshotPath}`)
    }
  }

  lines.push("")
}

lines.push("## 6. 下一步")
lines.push("")
lines.push("- 补齐各平台登录态后重新采集受限页面。")
lines.push("- 对每家公司写人工结论，不把 observation 原文直接发布到 App。")
lines.push("- 从研报中抽取适合产品化的栏目：公司画像、求职风险、面试提醒、行业榜单。")
lines.push("- 只有当某些结论需要结构化展示时，再转成数据库 seed 或后台配置。")
lines.push("")

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, lines.join("\n"), "utf8")

console.log(`Wrote ${path.relative(appRoot, outputPath)} from ${observations.length} observations`)
