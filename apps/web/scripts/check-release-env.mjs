const required = [
  "AUTH_SECRET",
  "DATABASE_URL",
  "CRON_SECRET",
  "MAIL_FROM_DOMAIN",
  "APP_RELEASE",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_ICP_FILING_NUMBER",
  "SUPPORT_EMAIL",
]

const missing = required.filter((name) => !process.env[name]?.trim())
const errors = []

if (missing.length) errors.push(`Missing: ${missing.join(", ")}`)
if (process.env.INVITE_REQUIRED !== "true") {
  errors.push("INVITE_REQUIRED must be true for the invite-only Beta")
}
if (!process.env.DATABASE_ADAPTER) {
  errors.push("DATABASE_ADAPTER is required")
} else if (!new Set(["pg", "neon"]).has(process.env.DATABASE_ADAPTER)) {
  errors.push("DATABASE_ADAPTER must be pg or neon")
}
if (process.env.NEXT_PUBLIC_APP_ENV === "production" && process.env.DATABASE_ADAPTER !== "pg") {
  errors.push("DATABASE_ADAPTER must be pg for mainland production")
}
if (process.env.DATABASE_DRIVER) {
  errors.push("DATABASE_DRIVER is deprecated; use DATABASE_ADAPTER")
}
if (!new Set(["aliyun-direct-mail", "resend"]).has(process.env.MAIL_PROVIDER)) {
  errors.push("MAIL_PROVIDER must be aliyun-direct-mail or resend")
}
if (process.env.MAIL_PROVIDER === "aliyun-direct-mail") {
  for (const name of ["ALIYUN_DM_ACCOUNT_NAME", "ALIYUN_DM_REGION"]) {
    if (!process.env[name]?.trim()) errors.push(`${name} is required for Aliyun DirectMail`)
  }
}
if (process.env.MAIL_PROVIDER === "resend" && !process.env.RESEND_API_KEY?.trim()) {
  errors.push("RESEND_API_KEY is required for Resend")
}
if (!new Set(["stdout", "webhook"]).has(process.env.ERROR_REPORTING_MODE)) {
  errors.push("ERROR_REPORTING_MODE must be stdout or webhook")
}
if (process.env.ERROR_REPORTING_MODE === "webhook" && !process.env.ERROR_REPORTING_WEBHOOK?.trim()) {
  errors.push("ERROR_REPORTING_WEBHOOK is required in webhook mode")
}
if (process.env.NEXT_PUBLIC_API_ENABLED !== "true") {
  errors.push("NEXT_PUBLIC_API_ENABLED must be true; production cannot use mock fallbacks")
}
if (process.env.LAUNCH_SCOPE_ONLY !== "true") {
  errors.push("LAUNCH_SCOPE_ONLY must be true so deferred P2 routes stay unavailable")
}
if (process.env.NEXT_PUBLIC_APP_ENV !== "production" && process.env.NEXT_PUBLIC_APP_ENV !== "staging") {
  errors.push("NEXT_PUBLIC_APP_ENV must be staging or production")
}
if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length < 32) {
  errors.push("AUTH_SECRET must contain at least 32 characters")
}
if (process.env.ERROR_REPORTING_MODE === "webhook" && process.env.ERROR_REPORTING_WEBHOOK) {
  try {
    const url = new URL(process.env.ERROR_REPORTING_WEBHOOK)
    if (url.protocol !== "https:") errors.push("ERROR_REPORTING_WEBHOOK must use HTTPS")
  } catch {
    errors.push("ERROR_REPORTING_WEBHOOK must be a valid URL")
  }
}
if (process.env.NEXT_PUBLIC_APP_URL) {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_APP_URL)
    if (url.protocol !== "https:") errors.push("NEXT_PUBLIC_APP_URL must use HTTPS")
    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
      errors.push("NEXT_PUBLIC_APP_URL must not point to localhost")
    }
  } catch {
    errors.push("NEXT_PUBLIC_APP_URL must be a valid URL")
  }
}
if (process.env.SUPPORT_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.SUPPORT_EMAIL)) {
  errors.push("SUPPORT_EMAIL must be a valid email address")
}

if (errors.length) {
  console.error(`Release environment check failed:\n- ${errors.join("\n- ")}`)
  process.exit(1)
}

console.log(`Release environment is valid for ${process.env.NEXT_PUBLIC_APP_ENV}.`)
