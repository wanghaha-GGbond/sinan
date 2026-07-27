import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import readline from "node:readline/promises"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

import { chromium } from "@playwright/test"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")

const args = new Set(process.argv.slice(2))
const headless = !args.has("--headed")
const inputArg = process.argv.find((arg) => arg.startsWith("--input="))
const outputArg = process.argv.find((arg) => arg.startsWith("--output="))
const storageStateArg = process.argv.find((arg) => arg.startsWith("--storage-state="))
const saveStorageStateArg = process.argv.find((arg) => arg.startsWith("--save-storage-state="))
const userDataDirArg = process.argv.find((arg) => arg.startsWith("--user-data-dir="))
const platformsArg = process.argv.find((arg) => arg.startsWith("--platforms="))
const platformArg = process.argv.find((arg) => arg.startsWith("--platform="))
const screenshots = args.has("--screenshots")
const loginSetup = args.has("--login-setup")
const systemBrowser = args.has("--system-browser")
const manualVerify = args.has("--manual-verify")
const replaceOutput = args.has("--replace")
const collectDetails = args.has("--details")
const detailLimitArg = process.argv.find((arg) => arg.startsWith("--detail-limit="))
const detailTimeoutArg = process.argv.find((arg) => arg.startsWith("--detail-timeout="))
const companyLimitArg = process.argv.find((arg) => arg.startsWith("--company-limit="))
const companiesArg = process.argv.find((arg) => arg.startsWith("--company="))
const querySuffixArg = process.argv.findLast((arg) => arg.startsWith("--query-suffix="))
const pageWaitArg = process.argv.find((arg) => arg.startsWith("--page-wait="))
const allowAssets = args.has("--allow-assets")

const inputPath = path.resolve(
  appRoot,
  inputArg?.slice("--input=".length) ?? "src/db/seeds/research-targets.json"
)
const outputPath = path.resolve(
  appRoot,
  outputArg?.slice("--output=".length) ?? "src/db/seeds/research-observations.json"
)
const storageStatePath = storageStateArg
  ? path.resolve(appRoot, storageStateArg.slice("--storage-state=".length))
  : undefined
const saveStorageStatePath = saveStorageStateArg
  ? path.resolve(appRoot, saveStorageStateArg.slice("--save-storage-state=".length))
  : undefined
const userDataDir = userDataDirArg
  ? path.resolve(appRoot, userDataDirArg.slice("--user-data-dir=".length))
  : undefined
const artifactDir = path.resolve(
  appRoot,
  "src/db/seeds/research-artifacts",
  new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-")
)
const detailLimit = detailLimitArg
  ? Number.parseInt(detailLimitArg.slice("--detail-limit=".length), 10)
  : 2
const detailTimeoutMs = detailTimeoutArg
  ? Number.parseInt(detailTimeoutArg.slice("--detail-timeout=".length), 10)
  : undefined
const companyLimit = companyLimitArg
  ? Number.parseInt(companyLimitArg.slice("--company-limit=".length), 10)
  : undefined
const companyNameFilter = companiesArg
  ?.slice("--company=".length)
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean)
const querySuffix = querySuffixArg?.slice("--query-suffix=".length).trim() ?? ""
const pageWaitMs = pageWaitArg
  ? Number.parseInt(pageWaitArg.slice("--page-wait=".length), 10)
  : undefined

const platformSearch = {
  boss_zhipin: (query) =>
    `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(query)}`,
  xiaohongshu: (query) =>
    `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(query)}`,
  weibo: (query) => `https://s.weibo.com/weibo?q=${encodeURIComponent(query)}`,
  zhihu: (query) =>
    `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(query)}`,
}

const platformHome = {
  boss_zhipin: "https://www.zhipin.com/",
  xiaohongshu: "https://www.xiaohongshu.com/",
  weibo: "https://weibo.com/",
  zhihu: "https://www.zhihu.com/",
}

function openInSystemBrowser(url) {
  return new Promise((resolve) => {
    const child = spawn("open", [url], {
      detached: true,
      stdio: "ignore",
    })
    child.on("error", () => resolve(false))
    child.on("spawn", () => {
      child.unref()
      resolve(true)
    })
  })
}

function nowIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function cleanText(value, maxLength) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
}

function slug(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "unknown"
}

async function readExistingObservations(filePath) {
  try {
    const existing = JSON.parse(await readFile(filePath, "utf8"))
    return Array.isArray(existing.observations) ? existing.observations : []
  } catch (error) {
    if (error?.code === "ENOENT") return []
    throw error
  }
}

function observationKey(item) {
  return [item.companyName, item.platform, item.query].join("\u0000")
}

function hasUsableEvidence(item) {
  if (item.access !== "ok") return false
  const text = String(item.visibleText ?? "").replace(/\s+/g, " ").trim()
  const companyName = String(item.companyName ?? "").trim()

  if (text.length < 120) return false
  if (companyName && !text.includes(companyName)) return false
  if (item.platform === "xiaohongshu" && text.includes("沪ICP备") && !text.includes("筛选")) {
    return false
  }
  if (item.platform === "zhihu" && text.length < 300) return false
  if (["加载中，请稍候", "BOSS直聘"].includes(text)) return false
  return true
}

function observationQuality(item) {
  const accessScore = {
    ok: 500,
    login_required: 300,
    verification_required: 250,
    manual_required: 200,
    limited_or_failed: 100,
    unsupported_platform: 0,
  }[item.access] ?? 0
  const detailScore = (item.details ?? []).filter((detail) => detail.access === "ok").length * 100
  const usableScore = hasUsableEvidence(item) ? 700 : 0
  const textScore = hasUsableEvidence(item)
    ? Math.min(String(item.visibleText ?? "").length, 2000) / 100
    : 0
  return accessScore + usableScore + detailScore + textScore
}

function mergeObservations(previous, current) {
  const byKey = new Map(previous.map((item) => [observationKey(item), item]))
  for (const item of current) {
    const key = observationKey(item)
    const existing = byKey.get(key)
    if (!existing || observationQuality(item) >= observationQuality(existing)) {
      byKey.set(key, item)
    }
  }
  return [...byKey.values()]
}

async function writeObservationOutput(currentObservations) {
  const existingObservations = replaceOutput ? [] : await readExistingObservations(outputPath)
  const mergedObservations = mergeObservations(existingObservations, currentObservations)
  const output = {
    generatedAt: nowIsoDate(),
    source: path.relative(appRoot, inputPath),
    policy:
      "Public-page observations only. Do not import raw observations directly into the app seed database.",
    summary: mergedObservations.reduce((summary, item) => {
      summary.total += 1
      summary.byAccess[item.access] = (summary.byAccess[item.access] ?? 0) + 1
      summary.byPlatform[item.platform] = summary.byPlatform[item.platform] ?? {}
      summary.byPlatform[item.platform][item.access] =
        (summary.byPlatform[item.platform][item.access] ?? 0) + 1
      return summary
    }, { total: 0, byAccess: {}, byPlatform: {} }),
    observations: mergedObservations,
  }

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, JSON.stringify(output, null, 2) + "\n", "utf8")
  return output
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function installVerificationViewportAssist(page, platform) {
  if (platform !== "boss_zhipin") return
  await page
    .addInitScript(() => {
      const zoom = "0.7"
      const verifyTextPattern = /安全验证|点击按钮进行验证|请选择|验证|拖动|滑块/

      function verificationTarget() {
        const candidates = Array.from(
          document.querySelectorAll("button, [role='button'], div, section, main")
        )
        return (
          candidates.find((element) =>
            verifyTextPattern.test(element.textContent?.replace(/\s+/g, " ") ?? "")
          ) ?? document.body
        )
      }

      function adjustVerificationViewport() {
        if (!verifyTextPattern.test(document.body?.innerText ?? "")) return
        document.documentElement.style.zoom = zoom
        document.body.style.minHeight = "1600px"

        const target = verificationTarget()
        const rect = target.getBoundingClientRect()
        const isOffscreen = rect.top < 96 || rect.bottom > window.innerHeight - 48
        if (isOffscreen) {
          target.scrollIntoView({ block: "center", inline: "center" })
        }
      }

      window.__bossVerificationViewportAssist = adjustVerificationViewport
      window.addEventListener("load", adjustVerificationViewport)
      new MutationObserver(() => window.setTimeout(adjustVerificationViewport, 80)).observe(
        document.documentElement,
        { childList: true, subtree: true }
      )
      window.setInterval(adjustVerificationViewport, 1500)
    })
    .catch(() => undefined)
}

async function makeVerificationControlReachable(page, platform) {
  if (platform !== "boss_zhipin") return
  await page
    .evaluate(() => {
      if (typeof window.__bossVerificationViewportAssist === "function") {
        window.__bossVerificationViewportAssist()
        return
      }
      document.documentElement.style.zoom = "0.7"
      window.scrollTo({ top: 420, behavior: "instant" })
    })
    .catch(() => undefined)
}

async function waitForEnter(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  try {
    await rl.question(message)
  } finally {
    rl.close()
  }
}

function companyQuery(company, platform) {
  const baseQuery = company.queries?.[platform] ?? `${company.name} ${company.city ?? ""}`.trim()
  return [baseQuery, querySuffix].filter(Boolean).join(" ")
}

function classifyAccess({ status, title, visibleText, finalUrl }) {
  const haystack = `${title}\n${visibleText}\n${finalUrl}`.toLowerCase()
  if (status === 401 || /登录|login|sign in|注册/.test(haystack)) return "login_required"
  if (status === 403) return "limited_or_failed"
  if (/验证码|安全验证|captcha|verify|verification/.test(haystack)) {
    return "verification_required"
  }
  if (/出了点问题|重新加载|forbidden|access denied|访问过于频繁|请求存在异常|暂时限制本次访问/.test(haystack)) {
    return "limited_or_failed"
  }
  if (status && status >= 200 && status < 400) return "ok"
  return "limited_or_failed"
}

function nextActionForAccess(access) {
  if (access === "ok") return "review_observation"
  if (access === "manual_required") return "open_in_normal_browser_and_add_manual_notes"
  if (access === "login_required") {
    return "rerun_with_headed_user_data_dir_after_manual_login"
  }
  if (access === "verification_required") return "manual_review_required"
  if (access === "unsupported_platform") return "remove_or_implement_platform"
  return "manual_review_required"
}

async function extractLinks(page, maxLinks) {
  return page
    .locator("a")
    .evaluateAll(
      (anchors, limit) =>
        anchors
          .map((anchor) => ({
            text: anchor.textContent?.replace(/\s+/g, " ").trim() ?? "",
            href: anchor.href,
          }))
          .filter((item) => item.text && item.href)
          .slice(0, limit),
      maxLinks
    )
    .catch(() => [])
}

async function captureScreenshot(page, { company, platform, enabled, suffix }) {
  if (!enabled) return undefined
  await mkdir(artifactDir, { recursive: true })
  const filePath = path.join(
    artifactDir,
    `${slug(company.name)}-${platform}${suffix ? `-${slug(suffix)}` : ""}.png`
  )
  await page.screenshot({ path: filePath, fullPage: true }).catch(() => undefined)
  return path.relative(appRoot, filePath)
}

function detailCandidateLinks({ platform, links, companyName }) {
  const seen = new Set()
  const blockedText = /首页|发布|登录|注册|客服|营业执照|许可证|隐私|用户协议|举报|帮助|关于我们|客户端下载|APP下载/
  const blockedHref = /passport|login|register|protocol|businesslicense|about|download|javascript:|#/
  const platformHref = {
    boss_zhipin: /zhipin\.com\/web\/geek\/job|zhipin\.com\/job_detail/,
    xiaohongshu: /xiaohongshu\.com\/(?:explore|discovery\/item)\//,
    weibo: /weibo\.com\/\d+\/[A-Za-z0-9]+|weibo\.com\/detail\/[A-Za-z0-9]+|weibo\.cn\/comment\/[A-Za-z0-9]+/,
    zhihu: /zhihu\.com\/question\/|zhihu\.com\/answer\/|zhuanlan\.zhihu\.com\/p\//,
  }[platform]

  return (links ?? [])
    .filter((link) => link.href && !blockedHref.test(link.href))
    .filter((link) => !blockedText.test(link.text ?? ""))
    .filter((link) => !platformHref || platformHref.test(link.href))
    .filter((link) => {
      const key = link.href.replace(/[?#].*$/, "")
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .filter((link) => {
      if (platform === "xiaohongshu") return true
      if (platform === "weibo") return true
      const text = `${link.text ?? ""} ${link.href}`
      return text.includes(companyName) || /工作|体验|面试|招聘|裁员|奖金|年终|offer|实习|岗位|薪酬/.test(text)
    })
}

async function collectDetailPage(context, { company, platform, link, timeoutMs, maxTextLength, screenshots, index }) {
  const page = await context.newPage()
  await installVerificationViewportAssist(page, platform)
  const startedAt = new Date().toISOString()
  try {
    const response = await page.goto(link.href, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    })
    await page.waitForTimeout(1400)
    const title = await page.title().catch(() => "")
    const visibleText = await page
      .locator("body")
      .innerText({ timeout: 5000 })
      .catch(() => "")
    const finalUrl = page.url()
    const cleanVisibleText = cleanText(visibleText, maxTextLength)
    const access = classifyAccess({
      status: response?.status() ?? 200,
      title,
      visibleText: cleanVisibleText,
      finalUrl,
    })
    const screenshotPath = await captureScreenshot(page, {
      company,
      platform,
      enabled: screenshots || access !== "ok",
      suffix: `detail-${index + 1}`,
    })

    return {
      sourceText: cleanText(link.text, 140),
      requestedUrl: link.href,
      finalUrl,
      status: response?.status() ?? null,
      title: cleanText(title, 180),
      visibleText: cleanVisibleText,
      access,
      collectedAt: startedAt,
      screenshotPath,
    }
  } catch (error) {
    return {
      sourceText: cleanText(link.text, 140),
      requestedUrl: link.href,
      finalUrl: page.url(),
      status: null,
      title: "",
      visibleText: "",
      access: "limited_or_failed",
      collectedAt: startedAt,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    await page.close().catch(() => undefined)
  }
}

async function collectDetailPages(page, observation, options) {
  if (!options.collectDetails || observation.access !== "ok") return []
  const pageLinks = await extractLinks(page, options.maxDetailLinks)
  const candidates = detailCandidateLinks({
    platform: observation.platform,
    links: [...(observation.links ?? []), ...pageLinks],
    companyName: observation.companyName,
  }).slice(0, options.detailLimit)

  const details = []
  for (const [index, link] of candidates.entries()) {
    console.log(
      `Detail ${index + 1}/${candidates.length}: ${observation.companyName} / ${observation.platform} / ${cleanText(link.text || link.href, 60)}`
    )
    details.push(
      await collectDetailPage(page.context(), {
        company: options.company,
        platform: observation.platform,
        link,
        timeoutMs: options.detailTimeoutMs ?? options.timeoutMs,
        maxTextLength: options.maxDetailTextLength,
        screenshots: options.screenshots,
        index,
      })
    )
    await wait(options.detailDelayMs)
  }
  return details
}

async function collectPageObservationOnce(
  page,
  { company, platform, query, maxTextLength, maxLinks, timeoutMs, pageWaitMs }
) {
  const url = platformSearch[platform](query)
  const startedAt = new Date().toISOString()

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    })
    await page.waitForTimeout(pageWaitMs)

    const title = await page.title().catch(() => "")
    const visibleText = await page
      .locator("body")
      .innerText({ timeout: 5000 })
      .catch(() => "")
    const finalUrl = page.url()
    const status = response?.status() ?? null
    const cleanVisibleText = cleanText(visibleText, maxTextLength)
    const access =
      platform === "boss_zhipin" && finalUrl === "about:blank" && !cleanVisibleText
        ? "manual_required"
        : classifyAccess({
      status,
      title,
      visibleText: cleanVisibleText,
      finalUrl,
    })
    const links = await extractLinks(page, maxLinks)

    return {
      companyName: company.name,
      platform,
      query,
      requestedUrl: url,
      finalUrl,
      status,
      title: cleanText(title, 200),
      visibleText: cleanVisibleText,
      links,
      collectedAt: startedAt,
      access,
      nextAction: nextActionForAccess(access),
      notes:
        access === "ok"
          ? "Public page loaded. Review visibleText before turning it into seed data."
          : access === "manual_required"
            ? "This platform rendered blank in Playwright. Open requestedUrl in a normal browser and add manual notes to the report."
            : "Page may require login, verification, or manual review. Do not bypass platform access controls.",
      querySuffix: querySuffix || undefined,
    }
  } catch (error) {
    return {
      companyName: company.name,
      platform,
      query,
      requestedUrl: url,
      finalUrl: page.url(),
      status: null,
      title: "",
      visibleText: "",
      collectedAt: startedAt,
      access: "limited_or_failed",
      nextAction: nextActionForAccess("limited_or_failed"),
      error: error instanceof Error ? error.message : String(error),
      notes:
        "Collection failed. Do not bypass login, CAPTCHA, paywalls, or platform access controls.",
      querySuffix: querySuffix || undefined,
    }
  }
}

async function collectCurrentPageObservation(
  page,
  { company, platform, query, requestedUrl, maxTextLength, maxLinks }
) {
  const title = await page.title().catch(() => "")
  const visibleText = await page
    .locator("body")
    .innerText({ timeout: 5000 })
    .catch(() => "")
  const finalUrl = page.url()
  const cleanVisibleText = cleanText(visibleText, maxTextLength)
  const access =
    platform === "boss_zhipin" && finalUrl === "about:blank" && !cleanVisibleText
      ? "manual_required"
      : classifyAccess({
          status: 200,
          title,
          visibleText: cleanVisibleText,
          finalUrl,
        })
  const links = await extractLinks(page, maxLinks)

  return {
    companyName: company.name,
    platform,
    query,
    requestedUrl,
    finalUrl,
    status: 200,
    title: cleanText(title, 200),
    visibleText: cleanVisibleText,
    links,
    collectedAt: new Date().toISOString(),
    access,
    nextAction: nextActionForAccess(access),
    notes:
      access === "ok"
        ? "Public page loaded after manual verification. Review visibleText before turning it into report material."
        : "Manual verification did not produce a readable page. Review this platform manually.",
    querySuffix: querySuffix || undefined,
  }
}

async function collectPageObservation(page, options) {
  const retryCount = options.retryCount
  let lastObservation

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const observation = await collectPageObservationOnce(page, options)
    lastObservation = { ...observation, attempt: attempt + 1 }
    if (observation.access === "ok" || attempt === retryCount) break
    await wait(options.retryDelayMs)
  }

  if (
    options.manualVerify &&
    lastObservation.access === "verification_required"
  ) {
    console.log(`\nManual verification needed: ${options.platform} / ${options.company.name}`)
    console.log("Please complete the verification in the browser window.")
    await waitForEnter("Press Enter here after verification is complete...")
    lastObservation = {
      ...(await collectCurrentPageObservation(page, {
        company: options.company,
        platform: options.platform,
        query: options.query,
        requestedUrl: lastObservation.requestedUrl,
        maxTextLength: options.maxTextLength,
        maxLinks: options.maxLinks,
      })),
      attempt: lastObservation.attempt,
      manualVerificationAttempted: true,
    }
  }

  const screenshotPath = await captureScreenshot(page, {
    company: options.company,
    platform: options.platform,
    enabled: options.screenshots || lastObservation.access !== "ok",
  })
  const details = await collectDetailPages(page, lastObservation, options)
  const observationWithDetails = details.length > 0
    ? {
        ...lastObservation,
        details,
        detailSummary: {
          attempted: details.length,
          ok: details.filter((item) => item.access === "ok").length,
        },
      }
    : lastObservation

  return screenshotPath
    ? { ...observationWithDetails, screenshotPath }
    : observationWithDetails
}

const config = JSON.parse(await readFile(inputPath, "utf8"))
const defaults = {
  platforms: ["boss_zhipin", "xiaohongshu", "weibo", "zhihu"],
  maxTextLength: 2400,
  maxDetailTextLength: 3200,
  maxLinks: 20,
  maxDetailLinks: 200,
  timeoutMs: 20000,
  retryCount: 1,
  retryDelayMs: 2000,
  delayMs: 1500,
  detailDelayMs: 1200,
  detailTimeoutMs: 8000,
  pageWaitMs: 1500,
  blockAssets: true,
  ...(config.defaults ?? {}),
}
const cliPlatforms = (platformsArg?.slice("--platforms=".length) ?? platformArg?.slice("--platform=".length))
  ?.split(",")
  .map((platform) => platform.trim())
  .filter(Boolean)
const selectedPlatforms = cliPlatforms?.length ? cliPlatforms : defaults.platforms

const companies = (config.companies ?? [])
  .filter((company) => !companyNameFilter?.length || companyNameFilter.includes(company.name))
  .slice(0, companyLimit ?? undefined)
if (companies.length === 0) {
  const filterText = companyNameFilter?.length ? ` matching --company=${companyNameFilter.join(",")}` : ""
  throw new Error(`No companies${filterText} found in ${path.relative(appRoot, inputPath)}`)
}

let browser
let context
const contextOptions = {
  locale: "zh-CN",
  viewport: { width: 1440, height: 1200 },
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  storageState: storageStatePath,
}

if (userDataDir) {
  const launchOptions = {
    ...contextOptions,
    headless,
    timeout: 30000,
  }
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      context = await chromium.launchPersistentContext(userDataDir, launchOptions)
      break
    } catch (error) {
      if (attempt === 2) throw error
      console.warn(`Browser profile launch failed; retrying (${error.message})`)
      await wait(1500)
    }
  }
} else {
  browser = await chromium.launch({ headless })
  context = await browser.newContext(contextOptions)
}

if (defaults.blockAssets && !allowAssets && !loginSetup) {
  await context.route("**/*", (route) => {
    const type = route.request().resourceType()
    if (["image", "media", "font"].includes(type)) return route.abort()
    return route.continue()
  })
}

const observations = []
let writeOutput = true
try {
  if (loginSetup) {
    for (const platform of selectedPlatforms) {
      const url = platformHome[platform]
      if (!url) continue
      if (platform === "boss_zhipin" && systemBrowser) {
        await openInSystemBrowser(url)
        console.log(`\nLogin setup: ${platform}`)
        console.log(`Boss Zhipin renders blank in Playwright Chromium on this machine.`)
        console.log(`Opened in your normal system browser instead: ${url}`)
        console.log("Please finish login/research there. Boss observations may need manual notes.")
        await waitForEnter("Press Enter here after you finish Boss login/review, or if you want to skip Boss...")
        continue
      }
      const page = await context.newPage()
      await installVerificationViewportAssist(page, platform)
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: defaults.timeoutMs }).catch(
        () => undefined
      )
      await page.waitForTimeout(800)
      await makeVerificationControlReachable(page, platform)
      console.log(`\nLogin setup: ${platform}`)
      console.log(`Opened: ${url}`)
      console.log("Please finish login in the browser window.")
      await waitForEnter("Press Enter here after login is complete, or if you want to skip this platform...")
      await page.close().catch(() => undefined)
    }
    console.log("\nLogin setup finished. Re-run research:collect without --login-setup to collect observations.")
    writeOutput = false
  } else {
    for (const company of companies) {
      const platforms = cliPlatforms?.length ? cliPlatforms : company.platforms ?? selectedPlatforms
      for (const platform of platforms) {
        if (!platformSearch[platform]) {
          observations.push({
            companyName: company.name,
            platform,
            query: "",
            access: "unsupported_platform",
            nextAction: nextActionForAccess("unsupported_platform"),
            notes: `Unsupported platform: ${platform}`,
            collectedAt: new Date().toISOString(),
          })
          continue
        }

        const query = companyQuery(company, platform)
        console.log(`Collecting: ${company.name} / ${platform}`)
        const page = await context.newPage()
        await installVerificationViewportAssist(page, platform)
        const observation = await collectPageObservation(page, {
            company,
            platform,
            query,
            maxTextLength: defaults.maxTextLength,
            maxLinks: defaults.maxLinks,
            maxDetailLinks: defaults.maxDetailLinks,
            timeoutMs: defaults.timeoutMs,
            pageWaitMs: pageWaitMs ?? defaults.pageWaitMs,
            retryCount: defaults.retryCount,
            retryDelayMs: defaults.retryDelayMs,
            screenshots,
            manualVerify,
            collectDetails,
            detailLimit,
            maxDetailTextLength: defaults.maxDetailTextLength,
            detailDelayMs: defaults.detailDelayMs,
            detailTimeoutMs: detailTimeoutMs ?? defaults.detailTimeoutMs,
          })
        observations.push(observation)
        await writeObservationOutput(observations)
        await page.close().catch(() => undefined)
        await wait(defaults.delayMs)
      }
    }
  }
} finally {
  if (saveStorageStatePath) {
    await mkdir(path.dirname(saveStorageStatePath), { recursive: true })
    await context.storageState({ path: saveStorageStatePath }).catch(() => undefined)
  }
  await context.close()
  await browser?.close()
}

if (!writeOutput) {
  console.log("Login setup did not write observations.")
} else {
const output = await writeObservationOutput(observations)
const mergedObservations = output.observations

const okCount = observations.filter((item) => item.access === "ok").length
const totalOkCount = mergedObservations.filter((item) => item.access === "ok").length
console.log(
  `Wrote ${path.relative(appRoot, outputPath)} with ${mergedObservations.length} total observations (${observations.length} collected this run, ${okCount} ok this run, ${totalOkCount} ok total)`
)
}
