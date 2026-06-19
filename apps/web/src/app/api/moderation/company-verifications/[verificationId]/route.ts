import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireModerator } from "@/lib/server/auth"
import {
  approveVerification,
  rejectVerification,
  revokeVerification,
} from "@/lib/server/verification"

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({
    action: z.literal("reject"),
    rejectReason: z.string().trim().min(1, "请填写拒绝原因").max(500),
  }),
  z.object({
    action: z.literal("revoke"),
    rejectReason: z.string().trim().min(1, "请填写吊销原因").max(500),
  }),
])

/**
 * PATCH /api/moderation/company-verifications/[verificationId]
 *
 * Moderator action. Body: { action: "approve" | "reject" | "revoke", rejectReason? }
 *
 * - approve: marks approved + raises trust_level (L1 auto, L2 human)
 * - reject:  marks rejected with reason (user can re-apply)
 * - revoke:  marks revoked + recalculates trust_level (post-approval fraud)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ verificationId: string }> }
) {
  const { verificationId } = await params

  let moderator
  try {
    moderator = await requireModerator()
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 }
    )
  }

  try {
    const data = parsed.data

    if (data.action === "approve") {
      const result = await approveVerification(verificationId, moderator.userId)
      if (result.kind === "error") {
        return NextResponse.json(
          { error: result.message, code: result.code },
          { status: result.status }
        )
      }
      return NextResponse.json({ action: "approved", grantedTrustLevel: result.grantedTrustLevel })
    }

    if (data.action === "reject") {
      const result = await rejectVerification(verificationId, moderator.userId, data.rejectReason)
      if (result.kind === "error") {
        return NextResponse.json(
          { error: result.message, code: result.code },
          { status: result.status }
        )
      }
      return NextResponse.json({ action: "rejected" })
    }

    if (data.action === "revoke") {
      const result = await revokeVerification(verificationId, moderator.userId, data.rejectReason)
      if (result.kind === "error") {
        return NextResponse.json(
          { error: result.message, code: result.code },
          { status: result.status }
        )
      }
      return NextResponse.json({ action: "revoked" })
    }
  } catch (error) {
    console.error("[moderation/company-verifications] PATCH unexpected failure:", error)
    return NextResponse.json({ error: "操作失败，请稍后重试" }, { status: 500 })
  }
}
