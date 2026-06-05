import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { reviews } from "@/db/schema/reviews"
import { reviewReports } from "@/db/schema/review-reports"
import { getAuthUser } from "@/lib/server/auth"
import { getOrCreateAnonymousProfile } from "@/lib/server/anonymous-profile"

const VALID_REASONS = [
  "personal_attack",
  "privacy",
  "rumor",
  "mob",
  "leader_dox",
  "ai_spam",
  "competitor",
  "company_astro",
  "duplicate",
  "other",
] as const

type ReportReason = (typeof VALID_REASONS)[number]

const MAX_NOTE_LENGTH = 200

/**
 * POST /api/reviews/:reviewId/reports
 *
 * Submit a report on a single review. Authenticated users get
 * reporter_user_id attached; unauthenticated visitors fall back to a
 * fingerprint-backed anonymous profile scoped to the review.
 *
 * One open report per (user, review) — duplicate POSTs return the
 * existing report instead of creating a new one, so the UI can show
 * the original reason.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const reason = String(body.reason ?? "").trim() as ReportReason
  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json(
      { error: `reason must be one of: ${VALID_REASONS.join(", ")}` },
      { status: 400 }
    )
  }

  const noteRaw = body.note ? String(body.note).trim() : undefined
  const note = noteRaw ? noteRaw.slice(0, MAX_NOTE_LENGTH) : undefined

  try {
    const { db } = await import("@/db/client")

    // 1. Resolve review (must be visible, not deleted)
    const [review] = await db
      .select({ id: reviews.id, companyId: reviews.companyId })
      .from(reviews)
      .where(and(eq(reviews.id, reviewId), isNull(reviews.deletedAt)))
      .limit(1)

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    // 2. Identify reporter — auth user OR anonymous profile via fingerprint
    const authUser = await getAuthUser()
    const reporterUserId: string | null = authUser?.userId ?? null
    let reporterAnonymousProfileId: string | null = null
    let reporterFingerprintHash: string | null = null

    if (!reporterUserId) {
      const fingerprint =
        request.headers.get("x-sinan-fingerprint") ??
        request.cookies.get("sinan_anon_fp")?.value ??
        null
      if (!fingerprint) {
        // Need at least some identity — fingerprint header is the bare minimum.
        return NextResponse.json(
          { error: "Reporter identity required (login or fingerprint)" },
          { status: 400 }
        )
      }
      const profile = await getOrCreateAnonymousProfile({
        fingerprintHash: fingerprint,
        scope: { scopeType: "review", scopeId: reviewId },
      })
      reporterAnonymousProfileId = profile.id
      reporterFingerprintHash = fingerprint
    }

    // 3. Dedup: if an authenticated user already has an open report on this
    // review, return the existing one. Anonymous dedup is best-effort.
    if (reporterUserId) {
      const [existing] = await db
        .select()
        .from(reviewReports)
        .where(
          and(
            eq(reviewReports.reviewId, reviewId),
            eq(reviewReports.reporterUserId, reporterUserId)
          )
        )
        .limit(1)
      if (existing) {
        return NextResponse.json(
          {
            id: existing.id,
            status: existing.status,
            reason: existing.reason,
            createdAt: existing.createdAt.toISOString(),
            alreadyReported: true,
          },
          { status: 200 }
        )
      }
    }

    // 4. Insert
    const [row] = await db
      .insert(reviewReports)
      .values({
        reviewId,
        companyId: review.companyId,
        reporterUserId,
        reporterAnonymousProfileId,
        reporterFingerprintHash,
        reason,
        note: note ?? null,
      })
      .returning()

    return NextResponse.json(
      {
        id: row.id,
        status: row.status,
        reason: row.reason,
        createdAt: row.createdAt.toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[review-reports] POST failed", error)
    return NextResponse.json(
      { error: "Internal error submitting report" },
      { status: 500 }
    )
  }
}
