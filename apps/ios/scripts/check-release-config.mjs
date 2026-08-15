import { readFile } from "node:fs/promises"
import process from "node:process"

const ciMode = process.argv.includes("--ci")
const appConfig = JSON.parse(await readFile(new URL("../app.json", import.meta.url), "utf8"))
const easConfig = JSON.parse(await readFile(new URL("../eas.json", import.meta.url), "utf8"))
const expo = appConfig.expo ?? {}
const ios = expo.ios ?? {}
const production = easConfig.build?.production ?? {}
const submit = easConfig.submit?.production?.ios ?? {}
const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim()
const launchScopeOnly = process.env.EXPO_PUBLIC_LAUNCH_SCOPE_ONLY
const appFilingNumber = process.env.EXPO_PUBLIC_APP_FILING_NUMBER?.trim()

const errors = []
const warnings = []

function requireValue(value, message) {
  if (value === undefined || value === null || value === "") errors.push(message)
}

requireValue(expo.name, "app.json: expo.name is required")
requireValue(expo.slug, "app.json: expo.slug is required")
requireValue(expo.version, "app.json: expo.version is required")
if (expo.icon !== "./assets/icon-v2.png") {
  errors.push("app.json: release icon must use the full-bleed opaque icon-v2.png asset")
}
requireValue(ios.bundleIdentifier, "app.json: expo.ios.bundleIdentifier is required")
requireValue(ios.buildNumber, "app.json: expo.ios.buildNumber is required")

if (ios.bundleIdentifier !== "com.sinan.app") {
  errors.push("app.json: bundleIdentifier must remain com.sinan.app for this release")
}
if (ios.config?.usesNonExemptEncryption !== false) {
  errors.push("app.json: usesNonExemptEncryption must explicitly be false")
}
if (ios.privacyManifests?.NSPrivacyTracking !== false) {
  errors.push("app.json: NSPrivacyTracking must explicitly be false")
}
if (production.autoIncrement !== true) {
  errors.push("eas.json: production.autoIncrement must be true")
}

if (!apiUrl) {
  errors.push("EXPO_PUBLIC_API_URL is required")
} else {
  try {
    const parsed = new URL(apiUrl)
    if (parsed.protocol !== "https:") errors.push("EXPO_PUBLIC_API_URL must use HTTPS")
    if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
      errors.push("EXPO_PUBLIC_API_URL must not point to localhost")
    }
    if (!ciMode && (parsed.hostname.endsWith(".invalid") || parsed.hostname.endsWith(".example.com"))) {
      errors.push("EXPO_PUBLIC_API_URL must point to the deployed production API")
    }
  } catch {
    errors.push("EXPO_PUBLIC_API_URL must be a valid absolute URL")
  }
}

if (launchScopeOnly !== "true") {
  errors.push("EXPO_PUBLIC_LAUNCH_SCOPE_ONLY must be true for preview and production")
}
if (!appFilingNumber) {
  errors.push("EXPO_PUBLIC_APP_FILING_NUMBER is required before TestFlight/App Store release")
} else if (!ciMode && appFilingNumber.includes("PENDING")) {
  errors.push("EXPO_PUBLIC_APP_FILING_NUMBER must contain the issued APP filing number")
}
if (easConfig.build?.preview?.env?.EXPO_PUBLIC_API_URL !== "https://staging.sinanapp.cn") {
  errors.push("eas.json: preview API must use https://staging.sinanapp.cn")
}
if (production.env?.EXPO_PUBLIC_API_URL !== "https://sinanapp.cn") {
  errors.push("eas.json: production API must use https://sinanapp.cn")
}
if (easConfig.build?.preview?.env?.EXPO_PUBLIC_LAUNCH_SCOPE_ONLY !== "true") {
  errors.push("eas.json: preview must enable EXPO_PUBLIC_LAUNCH_SCOPE_ONLY")
}
if (production.env?.EXPO_PUBLIC_LAUNCH_SCOPE_ONLY !== "true") {
  errors.push("eas.json: production must enable EXPO_PUBLIC_LAUNCH_SCOPE_ONLY")
}

if (!expo.extra?.eas?.projectId) {
  const message = "app.json: expo.extra.eas.projectId is missing; run eas init before TestFlight"
  ciMode ? warnings.push(message) : errors.push(message)
}
if (!submit.ascAppId) {
  const message = "eas.json: submit.production.ios.ascAppId is missing"
  ciMode ? warnings.push(message) : errors.push(message)
}

for (const warning of warnings) console.warn(`warning: ${warning}`)
if (errors.length > 0) {
  for (const error of errors) console.error(`error: ${error}`)
  process.exit(1)
}

console.log(`iOS release config passed (${ciMode ? "CI" : "TestFlight"} mode)`)
