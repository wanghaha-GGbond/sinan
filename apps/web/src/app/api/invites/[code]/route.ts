import { NextRequest, NextResponse } from "next/server"

import { checkRateLimit, getRateLimitKey } from "@/lib/server/rate-limit"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 })
  }

  // Public invite preview — any visitor can probe a code. Apply a
  // soft per-IP cap so brute-force enumeration (1.1T combinations)
  // doesn't translate into a cheap scanning primitive. Authenticated
  // users hit this through a normal browser flow, so 30/min is well
  // above human rate.
  const rl = checkRateLimit(
    `invite-preview:${getRateLimitKey(request, "/api/invites/[code]")}`,
    { maxRequests: 30, windowSeconds: 60 }
  )
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rl.retryAfter },
      { status: 429 }
    )
  }

  try {
    const { db } = await import("@/db/client")
    const { invites } = await import("@/db/schema/invites")
    const { users } = await import("@/db/schema/users")
    const { companyVerifications } = await import("@/db/schema/company-verifications")
    const { eq, and, isNull } = await import("drizzle-orm")

    const [invite] = await db
      .select({
        id: invites.id,
        status: invites.status,
        inviterUserId: invites.inviterUserId,
      })
      .from(invites)
      .where(eq(invites.code, code.toUpperCase()))
      .limit(1)

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    // Fetch inviter public info
    const [inviter] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        trustLevel: users.trustLevel,
        jobBand: users.jobBand,
        yearsOfExperience: users.yearsOfExperience,
        reputationScore: users.reputationScore,
      })
      .from(users)
      .where(
        and(
          eq(users.id, invite.inviterUserId),
          eq(users.status, "active"),
          isNull(users.deletedAt)
        )
      )
      .limit(1)

    const [verification] = inviter
      ? await db
          .select({ companyName: companyVerifications.companyName })
          .from(companyVerifications)
          .where(
            and(
              eq(companyVerifications.applicantUserId, inviter.id),
              eq(companyVerifications.status, "approved")
            )
          )
          .limit(1)
      : []

    return NextResponse.json({
      code: code.toUpperCase(),
      status: invite.status,
      inviter: inviter
        ? {
            id: inviter.id,
            displayName: inviter.displayName,
            trustLevel: inviter.trustLevel ?? 0,
            reputationScore: inviter.reputationScore ?? 0,
            jobBand: inviter.jobBand,
            yearsOfExperience: inviter.yearsOfExperience,
            companyName: verification?.companyName ?? null,
          }
        : null,
    })
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
  }
}
