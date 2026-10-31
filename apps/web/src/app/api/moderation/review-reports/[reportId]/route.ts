import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { reviewReports } from "@/db/schema/review-reports"
import { reviews } from "@/db/schema/reviews"
import { moderationEvents } from "@/db/schema/moderation-events"
import { requireModerator } from "@/lib/server/auth"

const VALID_STATUSES = [
  "open",
  "reviewing",
  "actioned",
  "dismissed",
] as const

type ReportStatus = (typeof VALID_STATUSES)[number]

const ALLOWED_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  open: ["reviewing", "actioned", "dismissed"],
  reviewing: ["actioned", "dismissed"],
  actioned: ["reviewing", "dismissed"],
  dismissed: ["reviewing", "actioned"],
}

const VALID_REVIEW_ACTIONS = ["none", "hide", "limit"] as const
type ReviewAction = (typeof VALID_REVIEW_ACTIONS)[number]

/**
 * PATCH /api/moderation/review-reports/:reportId
 *
 * Moderator action on a single report. Allowed transitions:
 *   open      → reviewing | actioned | dismissed
 *   reviewing → actioned | dismissed
 *   actioned  → (terminal, but allow re-opening to dismissed)
 *   dismissed → (terminal, but allow re-opening to reviewing)
 *
 * An actioned report must explicitly record what happened to the underlying
 * review. Hide/limit changes are committed in the same transaction as the
 * report transition so the queue cannot claim a safety action that failed.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params

  let moderator
  try {
    moderator = await requireModerator(request)
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
  const reviewAction = body.reviewAction
    ? String(body.reviewAction).trim() as ReviewAction
    : null
  const maskedContent = body.maskedContent
    ? String(body.maskedContent).trim().slice(0, 3000) || null
    : null

  if (reviewAction && !VALID_REVIEW_ACTIONS.includes(reviewAction)) {
    return NextResponse.json(
      { error: `reviewAction must be one of: ${VALID_REVIEW_ACTIONS.join(", ")}` },
      { status: 400 },
    )
  }
  if (targetStatus === "actioned" && (!actionTaken || !reviewAction)) {
    return NextResponse.json(
      { error: "actioned reports require actionTaken and reviewAction" },
      { status: 400 },
    )
  }
  if (reviewAction === "limit" && !maskedContent) {
    return NextResponse.json(
      { error: "limit reviewAction requires maskedContent" },
      { status: 400 },
    )
  }

  try {
    const { db } = await import("@/db/client")

    const result = await db.transaction(async (tx) => {
      const [current] = await tx
        .select({
          id: reviewReports.id,
          reviewId: reviewReports.reviewId,
          status: reviewReports.status,
        })
        .from(reviewReports)
        .where(eq(reviewReports.id, reportId))
        .for("update")
        .limit(1)

      if (!current) return { kind: "not_found" as const }

      const currentStatus = current.status as ReportStatus
      if (!ALLOWED_TRANSITIONS[currentStatus].includes(targetStatus)) {
        return { kind: "conflict" as const, status: currentStatus }
      }

      const now = new Date()
      const [updated] = await tx
        .update(reviewReports)
        .set({
          status: targetStatus,
          moderatorUserId: moderator.userId,
          moderationNote,
          actionTaken,
          actionedAt:
            targetStatus === "actioned" || targetStatus === "dismissed"
              ? now
              : null,
          updatedAt: now,
        })
        .where(
          and(
            eq(reviewReports.id, reportId),
            eq(reviewReports.status, currentStatus),
          ),
        )
        .returning()

      if (!updated) return { kind: "conflict" as const, status: currentStatus }

      if (targetStatus === "actioned" && reviewAction && reviewAction !== "none") {
        const [review] = await tx
          .select({ status: reviews.status })
          .from(reviews)
          .where(eq(reviews.id, current.reviewId))
          .limit(1)
        const reviewStatus = reviewAction === "hide" ? "hidden" : "limited_visible"
        await tx
          .update(reviews)
          .set({
            status: reviewStatus,
            maskedContent: reviewAction === "limit" ? maskedContent : null,
            moderationReason: reviewAction === "hide" ? "privacy" : "sensitive_info",
            reviewedAt: now,
            updatedAt: now,
          })
          .where(eq(reviews.id, current.reviewId))

        await tx.insert(moderationEvents).values({
          entityType: "review",
          entityId: current.reviewId,
          actorUserId: moderator.userId,
          actorRole: moderator.role,
          fromStatus: review?.status ?? "unknown",
          toStatus: reviewStatus,
          reason: moderationNote,
        })
      }

      await tx.insert(moderationEvents).values({
        entityType: "review_report",
        entityId: reportId,
        actorUserId: moderator.userId,
        actorRole: moderator.role,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        reason: moderationNote,
      })

      return { kind: "updated" as const, updated }
    })

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }
    if (result.kind === "conflict") {
      return NextResponse.json(
        { error: "Report has already moved to another state", status: result.status },
        { status: 409 },
      )
    }

    const updated = result.updated

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
