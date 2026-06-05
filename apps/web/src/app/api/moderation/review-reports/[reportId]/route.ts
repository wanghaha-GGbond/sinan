import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { reviewReports } from "@/db/schema/review-reports"
import { requireModerator } from "@/lib/server/auth"

const VALID_STATUSES = [
  "open",
  "reviewing",
  "actioned",
  "dismissed",
] as const

type ReportStatus = (typeof VALID_STATUSES)[number]

/**
 * PATCH /api/moderation/review-reports/:reportId
 *
 * Moderator action on a single report. Allowed transitions:
 *   open      → reviewing | actioned | dismissed
 *   reviewing → actioned | dismissed
 *   actioned  → (terminal, but allow re-opening to dismissed)
 *   dismissed → (terminal, but allow re-opening to reviewing)
 *
 * This endpoint intentionally does NOT mutate the underlying review
 * (hide/limit visibility). The dedicated review moderation flow lives
 * in /api/moderation/reviews and will reference the report id once we
 * add that. Keeping the concerns separate avoids double-write bugs.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params

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

  const targetStatus = String(body.status ?? "").trim() as ReportStatus
  if (!VALID_STATUSES.includes(targetStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    )
  }

  const moderationNote = body.moderationNote
    ? String(body.moderationNote).trim().slice(0, 1000) || null
    : null
  const actionTaken = body.actionTaken
    ? String(body.actionTaken).trim().slice(0, 500) || null
    : null

  try {
    const { db } = await import("@/db/client")

    const [updated] = await db
      .update(reviewReports)
      .set({
        status: targetStatus,
        moderatorUserId: moderator.userId,
        moderationNote,
        actionTaken,
        actionedAt:
          targetStatus === "actioned" || targetStatus === "dismissed"
            ? new Date()
            : null,
        updatedAt: new Date(),
      })
      .where(eq(reviewReports.id, reportId))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    return NextResponse.json(
      {
        id: updated.id,
        status: updated.status,
        moderationNote: updated.moderationNote,
        actionTaken: updated.actionTaken,
        moderatorUserId: updated.moderatorUserId,
        actionedAt: updated.actionedAt?.toISOString() ?? null,
        updatedAt: updated.updatedAt.toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[review-reports] PATCH failed", error)
    return NextResponse.json(
      { error: "Internal error updating report" },
      { status: 500 }
    )
  }
}
