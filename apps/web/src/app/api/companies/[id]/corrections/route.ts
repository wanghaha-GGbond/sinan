import { NextRequest, NextResponse } from "next/server"
import { and, eq, inArray, isNull } from "drizzle-orm"
import { companies } from "@/db/schema/companies"
import { companyCorrections } from "@/db/schema/company-corrections"
import { getAuthUser } from "@/lib/server/auth"
import { getOrCreateAnonymousProfile } from "@/lib/server/anonymous-profile"

const VALID_FIELDS = [
  "name",
  "registeredName",
  "industry",
  "city",
  "size",
  "stage",
  "description",
  "website",
  "other",
] as const

type CorrectionField = (typeof VALID_FIELDS)[number]

const MAX_PROPOSED_LENGTH = 200
const MAX_REASON_LENGTH = 500
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * POST /api/companies/:companyId/corrections
 *
 * Submit a company-info correction request. Open to anyone —
 * the submission lands in the moderator queue. Submitter is
 * identified either by an authenticated user OR a fingerprint-backed
 * anonymous profile scoped to the company.
 *
 * Logged-in submitters get a partial-unique dedup per (user, company,
 * field) on open submissions; anonymous dedup is best-effort.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const field = String(body.field ?? "").trim() as CorrectionField
  if (!VALID_FIELDS.includes(field)) {
    return NextResponse.json(
      { error: `field must be one of: ${VALID_FIELDS.join(", ")}` },
      { status: 400 }
    )
  }

  const currentValue = String(body.currentValue ?? "").trim()
  const proposedRaw = String(body.proposedValue ?? "").trim()
  if (!proposedRaw) {
    return NextResponse.json(
      { error: "proposedValue is required" },
      { status: 400 }
    )
  }
  const proposedValue = proposedRaw.slice(0, MAX_PROPOSED_LENGTH)
  const reason = body.reason
    ? String(body.reason).trim().slice(0, MAX_REASON_LENGTH) || null
    : null

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
        scope: { scopeType: "company", scopeId: companyId },
      })
      submitterAnonymousProfileId = profile.id
      submitterFingerprintHash = fingerprint
    }

    // Dedup: logged-in submitter with same field already open → return existing
    if (submitterUserId) {
      const [existing] = await db
        .select()
        .from(companyCorrections)
        .where(
          and(
            eq(companyCorrections.companyId, companyId),
            eq(companyCorrections.submitterUserId, submitterUserId),
            eq(companyCorrections.field, field),
            inArray(companyCorrections.status, ["submitted", "reviewing"])
          )
        )
        .limit(1)
      if (existing) {
        return NextResponse.json(
          {
            id: existing.id,
            status: existing.status,
            field: existing.field,
            proposedValue: existing.proposedValue,
            createdAt: existing.createdAt.toISOString(),
            alreadySubmitted: true,
          },
          { status: 200 }
        )
      }
    }

    const [row] = await db
      .insert(companyCorrections)
      .values({
        companyId,
        submitterUserId,
        submitterAnonymousProfileId,
        submitterFingerprintHash,
        contactEmail,
        field,
        currentValue,
        proposedValue,
        reason,
      })
      .returning()

    return NextResponse.json(
      {
        id: row.id,
        status: row.status,
        field: row.field,
        proposedValue: row.proposedValue,
        createdAt: row.createdAt.toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[company-corrections] POST failed", error)
    return NextResponse.json(
      { error: "Internal error submitting correction" },
      { status: 500 }
    )
  }
}
