import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { users } from "@/db/schema/users"
import { checkAuthAccountLimit, checkAuthIpLimit } from "@/lib/server/auth-rate-limit"
import { findInvite, isInviteRequired } from "@/lib/server/invites"
import { isMailConfigured } from "@/lib/server/mail"
import { checkPersistentRateLimit } from "@/lib/server/persistent-rate-limit"
import { normalizeRegistrationEmail, REGISTRATION_CODE_RESEND_SECONDS } from "@/lib/server/registration-code-policy"
import { issueRegistrationCode } from "@/lib/server/registration-codes"

const headers = { "Cache-Control": "no-store" }

export async function POST(request: NextRequest) {
  let email: string, inviteCode: string | undefined
  try {
    const body = await request.json()
    const normalized = normalizeRegistrationEmail(body?.email)
    if (!normalized) throw new Error()
    email = normalized
    inviteCode = typeof body.inviteCode === "string" ? body.inviteCode.trim().toUpperCase() : undefined
  } catch {
    return NextResponse.json({ error: "请输入有效邮箱" }, { status: 400, headers })
  }
  if (isInviteRequired() && !inviteCode) {
    return NextResponse.json({ error: "请输入邀请码" }, { status: 403, headers })
  }
  if (!isMailConfigured()) {
    return NextResponse.json({ error: "验证码邮件暂不可用，请稍后再试" }, { status: 503, headers })
  }
  try {
    const ipLimit = await checkAuthIpLimit(request, "register-code")
    if (!ipLimit.allowed) return NextResponse.json({ error: ipLimit.unavailable ? "服务暂不可用" : "请求过于频繁，请稍后再试" },
      { status: ipLimit.unavailable ? 503 : 429, headers: { ...headers, "Retry-After": String(ipLimit.retryAfter) } })
    if (inviteCode && !(await findInvite(inviteCode))) {
      return NextResponse.json({ error: "邀请码无效或已使用" }, { status: 422, headers })
    }
    const { db } = await import("@/db/client")
    const [existing] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt))).limit(1)
    if (existing) return NextResponse.json({ error: "该邮箱已注册，请登录" }, { status: 409, headers })
    const accountLimit = await checkAuthAccountLimit("register-code", email)
    const hourlyLimit = accountLimit.allowed
      ? await checkPersistentRateLimit(`auth:register-code:hour:${email}`, { maxRequests: 5, windowSeconds: 3600 })
      : accountLimit
    if (!hourlyLimit.allowed) return NextResponse.json({ error: hourlyLimit.unavailable ? "服务暂不可用" : "发送过于频繁，请稍后重试" },
      { status: hourlyLimit.unavailable ? 503 : 429, headers: { ...headers, "Retry-After": String(hourlyLimit.retryAfter) } })
    // Await provider acceptance: do not return success for disabled or failed delivery.
    await issueRegistrationCode(email)
    return NextResponse.json({ message: "验证码已发送", retryAfter: REGISTRATION_CODE_RESEND_SECONDS }, { status: 202, headers })
  } catch {
    console.error(JSON.stringify({ event: "registration_code_failed", release: process.env.APP_RELEASE }))
    return NextResponse.json({ error: "验证码发送失败，请稍后重试" }, { status: 503, headers })
  }
}
