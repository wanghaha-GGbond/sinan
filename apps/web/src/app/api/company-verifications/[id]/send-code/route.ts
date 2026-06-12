import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { requireAuthUser } from "@/lib/server/auth"
import { checkRateLimit } from "@/lib/server/rate-limit"
import { issueVerificationCode } from "@/lib/server/verification"
import { sendMail, buildVerificationCodeEmail } from "@/lib/server/mail"

/**
 * POST /api/company-verifications/[id]/send-code
 *
 * Issues a 6-digit verification code and sends it to the applicant's work email.
 * Rate-limited: 1 email/minute per verification, 5/hour per email address.
 * Only the applicant for this verification may call this endpoint.
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

  try {
    const { db } = await import("@/db/client")
    const { companyVerifications } = await import("@/db/schema/company-verifications")

    const [verification] = await db
      .select({
        id: companyVerifications.id,
        applicantUserId: companyVerifications.applicantUserId,
        workEmail: companyVerifications.workEmail,
        proofType: companyVerifications.proofType,
        status: companyVerifications.status,
      })
      .from(companyVerifications)
      .where(eq(companyVerifications.id, verificationId))
      .limit(1)

    if (!verification) {
      return NextResponse.json({ error: "申请不存在" }, { status: 404 })
    }
    if (verification.applicantUserId !== authUser.userId) {
      return NextResponse.json({ error: "无权操作此申请" }, { status: 403 })
    }
    if (verification.proofType !== "work_email") {
      return NextResponse.json(
        { error: "此验证类型不使用邮箱验证码" },
        { status: 400 }
      )
    }
    if (verification.status === "approved") {
      return NextResponse.json({ error: "此申请已通过验证" }, { status: 400 })
    }
    if (verification.status === "rejected" || verification.status === "revoked") {
      return NextResponse.json({ error: "此申请已关闭" }, { status: 400 })
    }

    // Rate limiting: 1/min per verification, 5/hour per email
    const perVerifKey = `send-code:verif:${verificationId}`
    const perEmailKey = `send-code:email:${verification.workEmail}`

    const rlVerif = checkRateLimit(perVerifKey, { maxRequests: 1, windowSeconds: 60 })
    if (!rlVerif.allowed) {
      return NextResponse.json(
        { error: "发送太频繁，请稍后再试", retryAfter: rlVerif.retryAfter },
        { status: 429 }
      )
    }
    const rlEmail = checkRateLimit(perEmailKey, { maxRequests: 5, windowSeconds: 3600 })
    if (!rlEmail.allowed) {
      return NextResponse.json(
        { error: "该邮箱今日发送次数已达上限", retryAfter: rlEmail.retryAfter },
        { status: 429 }
      )
    }

    const code = await issueVerificationCode(verificationId)

    await sendMail({
      to: verification.workEmail,
      subject: "验证码",
      text: buildVerificationCodeEmail(code),
    })

    return NextResponse.json({ sent: true }, { status: 200 })
  } catch (error) {
    console.error("[send-code] failed:", error)
    return NextResponse.json({ error: "发送失败，请稍后重试" }, { status: 503 })
  }
}
