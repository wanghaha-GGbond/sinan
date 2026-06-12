import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { requireAuthUser } from "@/lib/server/auth"
import { checkRateLimit } from "@/lib/server/rate-limit"
import { confirmVerificationCode } from "@/lib/server/verification"

/**
 * POST /api/company-verifications/[id]/confirm-code
 *
 * Validates the submitted 6-digit code. On success, atomically marks the
 * verification approved and raises users.trust_level.
 *
 * Body: { code: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: verificationId } = await params

  let authUser
  try {
    authUser = await requireAuthUser()
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }

  const code = typeof body.code === "string" ? body.code.trim() : ""
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "验证码格式不正确" }, { status: 400 })
  }

  // Guard: only the applicant can confirm their own code
  try {
    const { db } = await import("@/db/client")
    const { companyVerifications } = await import("@/db/schema/company-verifications")

    const [verification] = await db
      .select({ applicantUserId: companyVerifications.applicantUserId })
      .from(companyVerifications)
      .where(eq(companyVerifications.id, verificationId))
      .limit(1)

    if (!verification) {
      return NextResponse.json({ error: "申请不存在" }, { status: 404 })
    }
    if (verification.applicantUserId !== authUser.userId) {
      return NextResponse.json({ error: "无权操作此申请" }, { status: 403 })
    }
  } catch (error) {
    console.error("[confirm-code] DB lookup failed:", error)
    return NextResponse.json({ error: "服务暂时不可用" }, { status: 503 })
  }

  // Brute-force guard: 10 attempts per verification per 10 minutes
  const rlKey = `confirm-code:${verificationId}`
  const rl = checkRateLimit(rlKey, { maxRequests: 10, windowSeconds: 600 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "尝试次数过多，请稍后再试", retryAfter: rl.retryAfter },
      { status: 429 }
    )
  }

  try {
    const result = await confirmVerificationCode(verificationId, code)

    if (result === "ok") {
      return NextResponse.json({ verified: true }, { status: 200 })
    }

    const messages: Record<string, string> = {
      invalid: "验证码不正确",
      expired: "验证码已过期，请重新发送",
      too_many_attempts: "错误次数过多，请重新发送验证码",
      not_found: "未找到有效验证码，请先发送",
    }

    return NextResponse.json(
      { error: messages[result] ?? "验证失败" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[confirm-code] failed:", error)
    return NextResponse.json({ error: "验证失败，请稍后重试" }, { status: 503 })
  }
}
