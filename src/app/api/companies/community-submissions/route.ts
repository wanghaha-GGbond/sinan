import { NextRequest, NextResponse } from "next/server"
import { eq, isNull, and } from "drizzle-orm"
import { companies } from "@/db/schema/companies"
import { validateCompanySubmission } from "@/lib/content-guard"
import { toPublicCompanyView } from "@/lib/server/company-view"

const CREDIT_CODE_RE = /^[0-9A-Z]{18}$/

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const registeredName = String(body.registeredName ?? "").trim()
  const unifiedSocialCreditCode = String(body.unifiedSocialCreditCode ?? "").trim().toUpperCase()
  const registeredAddress = String(body.registeredAddress ?? "").trim()
  const legalRepresentative = String(body.legalRepresentative ?? "").trim()
  const city = String(body.city ?? "").trim()
  const industry = String(body.industry ?? "").trim()

  const shortName = body.shortName ? String(body.shortName).trim() : undefined
  const englishName = body.englishName ? String(body.englishName).trim() : undefined
  const website = body.website ? String(body.website).trim() : undefined
  const size = body.size ? String(body.size).trim() : undefined
  const financingStage = body.financingStage ? String(body.financingStage).trim() : undefined
  const businessStatus = body.businessStatus ? String(body.businessStatus).trim() : undefined
  const foundedDate = body.foundedDate ? String(body.foundedDate).trim() : undefined
  const note = body.note ? String(body.note).trim() : undefined

  // Validate with existing content guard
  const validation = validateCompanySubmission({
    companyName: registeredName,
    unifiedSocialCreditCode,
    registeredAddress,
    legalRepresentative,
    city,
    industry,
    note,
  })

  if (!validation.ok) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.errors },
      { status: 400 }
    )
  }

  // Extra credit code format check
  if (!CREDIT_CODE_RE.test(unifiedSocialCreditCode)) {
    return NextResponse.json(
      { error: "统一社会信用代码格式不正确，需要 18 位大写字母或数字" },
      { status: 400 }
    )
  }

  const name = shortName || registeredName

  try {
    const { db } = await import("@/db/client")

    // Check for duplicate credit code
    const existing = await db
      .select({ id: companies.id })
      .from(companies)
      .where(
        and(
          eq(companies.unifiedSocialCreditCode, unifiedSocialCreditCode),
          isNull(companies.deletedAt)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "该统一社会信用代码已被提交" },
        { status: 409 }
      )
    }

    const [row] = await db
      .insert(companies)
      .values({
        name,
        registeredName,
        shortName,
        englishName,
        unifiedSocialCreditCode,
        registeredAddress,
        legalRepresentative,
        city,
        industry,
        website,
        size,
        financingStage,
        businessStatus,
        foundedDate:
          foundedDate && /^\d{4}-\d{2}-\d{2}$/.test(foundedDate)
            ? foundedDate
            : undefined,
        source: "user_added",
        reviewStatus: "pending_review",
        claimedStatus: "unclaimed",
        // submittedByUserId / submittedByAnonymousProfileId left null until auth is in place
      })
      .returning()

    return NextResponse.json({ company: toPublicCompanyView(row) }, { status: 201 })
  } catch (error) {
    console.error("POST /api/companies/community-submissions failed:", error)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    )
  }
}
