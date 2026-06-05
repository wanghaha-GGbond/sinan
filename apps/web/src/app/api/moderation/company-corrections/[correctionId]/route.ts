import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { companyCorrections } from "@/db/schema/company-corrections"
import { requireModerator } from "@/lib/server/auth"

const VALID_STATUSES = [
  "submitted",
  "reviewing",
  "approved",
  "rejected",
] as const

type CorrectionStatus = (typeof VALID_STATUSES)[number]

/**
 * PATCH /api/moderation/company-corrections/:correctionId
 *
 * Moderator decision on a single correction. Does NOT mutate the
 * underlying company row — the company-update flow is separate and
 * will reference the correctionId once we wire it. Keeping the
 * concerns separate avoids double-write bugs across two tables.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ correctionId: string }> }
) {
  const { correctionId } = await params

  let moderator
  try {
    moderator = await requireModerator()
  } catch (response) {
    if (response instanceof Response) return response
    throw response
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const targetStatus = String(body.status ?? "").trim() as CorrectionStatus
  if (!VALID_STATUSES.includes(targetStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    )
  }

  const moderationNote = body.moderationNote
    ? String(body.moderationNote).trim().slice(0, 1000) || null
    : null

  try {
    const { db } = await import("@/db/client")

    const [updated] = await db
      .update(companyCorrections)
      .set({
        status: targetStatus,
        moderatorUserId: moderator.userId,
        moderationNote,
        actionedAt:
          targetStatus === "approved" || targetStatus === "rejected"
            ? new Date()
            : null,
        updatedAt: new Date(),
      })
      .where(eq(companyCorrections.id, correctionId))
      .returning()

    if (!updated) {
      return NextResponse.json(
        { error: "Correction not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        id: updated.id,
        status: updated.status,
        moderationNote: updated.moderationNote,
        moderatorUserId: updated.moderatorUserId,
        actionedAt: updated.actionedAt?.toISOString() ?? null,
        updatedAt: updated.updatedAt.toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[company-corrections] PATCH failed", error)
    return NextResponse.json(
      { error: "Internal error updating correction" },
      { status: 500 }
    )
  }
}
