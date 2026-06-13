import { NextRequest, NextResponse } from "next/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  try {
    const { db } = await import("@/db/client")
    const { users } = await import("@/db/schema/users")
    const { companyVerifications } = await import("@/db/schema/company-verifications")
    const { eq, and, isNull } = await import("drizzle-orm")

    const [row] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        trustLevel: users.trustLevel,
        reputationScore: users.reputationScore,
        jobBand: users.jobBand,
        yearsOfExperience: users.yearsOfExperience,
        highlightMoment: users.highlightMoment,
        declinedOffer: users.declinedOffer,
        profileFieldsStatus: users.profileFieldsStatus,
        inviterUserId: users.inviterUserId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          eq(users.id, id),
          eq(users.status, "active"),
          isNull(users.deletedAt)
        )
      )
      .limit(1)

    if (!row) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Most recent approved verification for company name
    const [verification] = await db
      .select({ companyName: companyVerifications.companyName })
      .from(companyVerifications)
      .where(
        and(
          eq(companyVerifications.applicantUserId, id),
          eq(companyVerifications.status, "approved")
        )
      )
      .limit(1)

    // Inviter display name if exists
    let inviterName: string | null = null
    if (row.inviterUserId) {
      const [inviter] = await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(
          and(
            eq(users.id, row.inviterUserId),
            eq(users.status, "active"),
            isNull(users.deletedAt)
          )
        )
        .limit(1)
      inviterName = inviter?.displayName ?? null
    }

    return NextResponse.json({
      id: row.id,
      displayName: row.displayName,
      trustLevel: row.trustLevel ?? 0,
      reputationScore: row.reputationScore ?? 0,
      jobBand: row.jobBand,
      yearsOfExperience: row.yearsOfExperience,
      highlightMoment:
        row.profileFieldsStatus?.highlightMoment === "approved"
          ? row.highlightMoment
          : null,
      declinedOffer:
        row.profileFieldsStatus?.declinedOffer === "approved"
          ? row.declinedOffer
          : null,
      companyName: verification?.companyName ?? null,
      inviterName,
      createdAt: row.createdAt?.toISOString(),
    })
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
  }
}
