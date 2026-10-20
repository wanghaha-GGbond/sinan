import { after, NextRequest, NextResponse } from "next/server"
import { checkAuthAccountLimit, checkAuthIpLimit } from "@/lib/server/auth-rate-limit"
import { isMailConfigured } from "@/lib/server/mail"
import { issuePasswordReset } from "@/lib/server/password-recovery"
import { PASSWORD_RESET_ACCEPTED, passwordResetUrl } from "@/lib/server/password-recovery-policy"

const headers = { "Cache-Control": "no-store" }

export async function POST(request: NextRequest) {
  let email: string
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== "object" || !("email" in body) || typeof body.email !== "string") throw new Error()
    email = body.email.trim().toLowerCase()
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error()
  } catch {
    return NextResponse.json({ error: "请输入有效邮箱" }, { status: 400, headers })
  }

  // Check configuration independently of account existence.
  try {
    if (!isMailConfigured()) throw new Error()
    passwordResetUrl("0".repeat(64))
  } catch {
    return NextResponse.json({ error: "邮件找回暂不可用，请稍后再试" }, { status: 503, headers })
  }
  const limit = await checkAuthIpLimit(request, "forgot-password")
  if (!limit.allowed) return NextResponse.json({ error: limit.unavailable ? "服务暂不可用" : "请求过于频繁，请稍后再试" },
    { status: limit.unavailable ? 503 : 429, headers: { ...headers, "Retry-After": String(limit.retryAfter) } })
  const accountLimit = await checkAuthAccountLimit("forgot-password", email)
  if (!accountLimit.allowed && accountLimit.unavailable) {
    return NextResponse.json({ error: "服务暂不可用" }, { status: 503, headers })
  }
  if (accountLimit.allowed) {
    // Account lookup and delivery happen after the identical response to avoid
    // revealing registered addresses through content or provider latency.
    after(async () => {
      try { await issuePasswordReset(email) }
      catch { console.error(JSON.stringify({ event: "password_reset_delivery_failed", release: process.env.APP_RELEASE })) }
    })
  }
  return NextResponse.json({ message: PASSWORD_RESET_ACCEPTED }, { status: 202, headers })
}
