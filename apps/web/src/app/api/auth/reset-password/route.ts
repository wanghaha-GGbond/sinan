import { after, NextRequest, NextResponse } from "next/server"
import { clearAuthCookie } from "@/lib/server/auth"
import { checkAuthIpLimit } from "@/lib/server/auth-rate-limit"
import { consumePasswordReset } from "@/lib/server/password-recovery"
import { isNewPasswordValid, isPasswordResetToken } from "@/lib/server/password-recovery-policy"
import { sendMail } from "@/lib/server/mail"

const headers = { "Cache-Control": "no-store" }
export async function POST(request: NextRequest) {
  let token: string, password: string
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== "object" || !("token" in body) || !("password" in body) ||
      !isPasswordResetToken(body.token) || !isNewPasswordValid(body.password)) throw new Error()
    token = body.token
    password = body.password
  } catch {
    return NextResponse.json({ error: "链接无效或密码不符合要求（8–128 位）" }, { status: 400, headers })
  }
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "服务暂不可用" }, { status: 503, headers })
  const limit = await checkAuthIpLimit(request, "reset-password")
  if (!limit.allowed) return NextResponse.json({ error: limit.unavailable ? "服务暂不可用" : "请求过于频繁，请稍后再试" },
    { status: limit.unavailable ? 503 : 429, headers: { ...headers, "Retry-After": String(limit.retryAfter) } })
  try {
    const result = await consumePasswordReset(token, password)
    if (!result) return NextResponse.json({ error: "链接已失效，请重新申请" }, { status: 400, headers })
    await clearAuthCookie()
    after(async () => {
      try {
        await sendMail({ to: result.email, subject: "密码已更新", text: "你的密码已更新，所有设备需要重新登录。如果不是你本人操作，请立即找回密码并联系支持。" })
      } catch { console.error(JSON.stringify({ event: "password_reset_notice_failed", release: process.env.APP_RELEASE })) }
    })
    return NextResponse.json({ success: true }, { headers })
  } catch {
    console.error(JSON.stringify({ event: "password_reset_failed", release: process.env.APP_RELEASE }))
    return NextResponse.json({ error: "暂时无法更新密码，请稍后再试" }, { status: 503, headers })
  }
}
