import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { companyAppeals } from "@/db/schema/company-appeals"
import { requireModerator } from "@/lib/server/auth"

const VALID_STATUSES = [
  "submitted",
  "reviewing",
  "upheld",
  "rejected",
] as const

type AppealStatus = (typeof VALID_STATUSES)[number]

/**
 * PATCH /api/moderation/company-appeals/:appealId
 *
 * Moderator decision on a single appeal. Does NOT mutate the
 * underlying review row — the review-moderation flow is separate
 * and will reference the appealId once wired. Keeping concerns
 * separate avoids double-write bugs.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ appealId: string }> }
) {
  const { appealId } = await params

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

  const targetStatus = String(body.status ?? "").trim() as AppealStatus
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
      .update(companyAppeals)
      .set({
        status: targetStatus,
        moderatorUserId: moderator.userId,
        moderationNote,
        actionedAt:
          targetStatus === "upheld" || targetStatus === "rejected"
            ? new Date()
            : null,
        updatedAt: new Date(),
      })
      .where(eq(companyAppeals.id, appealId))
      .returning()

    if (!updated) {
      return NextResponse.json(
        { error: "Appeal not found" },
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
    console.error("[company-appeals] PATCH failed", error)
    return NextResponse.json(
      { error: "Internal error updating appeal" },
      { status: 500 }
    )
  }
}
