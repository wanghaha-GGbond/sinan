import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { companies } from "@/db/schema/companies"
import { reviews } from "@/db/schema/reviews"
import { companyAppeals } from "@/db/schema/company-appeals"
import { getAuthUser } from "@/lib/server/auth"
import { getOrCreateAnonymousProfile } from "@/lib/server/anonymous-profile"

const VALID_REASONS = [
  "personal_attack",
  "dox_leader",
  "fake_fact",
  "rumor",
  "ai_spam",
  "competitor",
  "other",
] as const

type AppealReason = (typeof VALID_REASONS)[number]

const MAX_NOTE_LENGTH = 500
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * POST /api/companies/:companyId/reviews/:reviewId/appeals
 *
 * Submit a company-side appeal against a single review. The review
 * must belong to the company. The submitter is identified by an
 * authenticated user OR a fingerprint-backed anonymous profile; a
 * contactEmail is encouraged (free text, validated) so the moderator
 * can reach back, but not required.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; reviewId: string }> }
) {
  const { companyId, reviewId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const reason = String(body.reason ?? "").trim() as AppealReason
  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json(
      { error: `reason must be one of: ${VALID_REASONS.join(", ")}` },
      { status: 400 }
    )
  }

  const noteRaw = body.note ? String(body.note).trim() : ""
  const note = noteRaw.slice(0, MAX_NOTE_LENGTH) || null

  const contactEmail = body.contactEmail
    ? String(body.contactEmail).trim().toLowerCase()
    : null
  if (contactEmail && !EMAIL_RE.test(contactEmail)) {
    return NextResponse.json(
      { error: "contactEmail must be a valid email" },
      { status: 400 }
    )
  }

  try {
    const { db } = await import("@/db/client")

    // Verify review belongs to company and both exist
    const [review] = await db
      .select({ id: reviews.id, companyId: reviews.companyId })
      .from(reviews)
      .where(
        and(
          eq(reviews.id, reviewId),
          eq(reviews.companyId, companyId),
          isNull(reviews.deletedAt)
        )
      )
      .limit(1)

    if (!review) {
      return NextResponse.json(
        { error: "Review not found for this company" },
        { status: 404 }
      )
    }

    const [company] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.id, companyId), isNull(companies.deletedAt)))
      .limit(1)

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const authUser = await getAuthUser()
    const submitterUserId: string | null = authUser?.userId ?? null
    let submitterAnonymousProfileId: string | null = null
    let submitterFingerprintHash: string | null = null

    if (!submitterUserId) {
      const fingerprint =
        request.headers.get("x-sinan-fingerprint") ??
        request.cookies.get("sinan_anon_fp")?.value ??
        null
      if (!fingerprint) {
        return NextResponse.json(
          { error: "Submitter identity required (login or fingerprint)" },
          { status: 400 }
        )
      }
      const profile = await getOrCreateAnonymousProfile({
        fingerprintHash: fingerprint,
        scope: { scopeType: "review", scopeId: reviewId },
      })
      submitterAnonymousProfileId = profile.id
      submitterFingerprintHash = fingerprint
    }

    const [row] = await db
      .insert(companyAppeals)
      .values({
        companyId,
        reviewId,
        submitterUserId,
        submitterAnonymousProfileId,
        submitterFingerprintHash,
        contactEmail,
        reason,
        note,
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
    console.error("[company-appeals] POST failed", error)
    return NextResponse.json(
      { error: "Internal error submitting appeal" },
      { status: 500 }
    )
  }
}
