import { NextRequest, NextResponse } from "next/server"
import { and, eq, inArray, isNull, desc, sql } from "drizzle-orm"
import { companies } from "@/db/schema/companies"
import { reviews } from "@/db/schema/reviews"
import { toPublicReviewView } from "@/lib/server/review-view"
import { getAuthUser } from "@/lib/server/auth"
import { getOrCreateAnonymousProfile } from "@/lib/server/anonymous-profile"
import { hasSensitive, hasAttackWord } from "@/lib/content-guard"

type SortMode = "latest" | "highest_score" | "most_helpful"

const VALID_ROLES = [
  "job_seeker",
  "current_employee",
  "former_employee",
  "interviewee",
  "intern",
  "contractor",
  "anonymous",
] as const

const ROLE_LABELS: Record<string, string> = {
  job_seeker: "匿名求职者",
  current_employee: "匿名在职员工",
  former_employee: "匿名过来人",
  interviewee: "匿名面试者",
  intern: "匿名实习生",
  contractor: "匿名外包/派遣",
  anonymous: "匿名评价者",
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const companyId = String(body.companyId ?? "").trim()
  const authorRole = String(body.authorRole ?? "anonymous").trim()
  const title = String(body.title ?? "").trim()
  const content = String(body.content ?? "").trim()
  const directionScore = Number(body.directionScore)

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 })
  }

  if (!VALID_ROLES.includes(authorRole as (typeof VALID_ROLES)[number])) {
    return NextResponse.json(
      { error: `Invalid authorRole. Must be one of: ${VALID_ROLES.join(", ")}` },
      { status: 400 }
    )
  }

  if (title.length < 2 || title.length > 80) {
    return NextResponse.json({ error: "Title must be 2–80 characters" }, { status: 400 })
  }

  if (content.length < 20 || content.length > 3000) {
    return NextResponse.json({ error: "Content must be 20–3000 characters" }, { status: 400 })
  }

  if (isNaN(directionScore) || directionScore < 0 || directionScore > 10) {
    return NextResponse.json({ error: "directionScore must be 0–10" }, { status: 400 })
  }

  if (hasSensitive(title) || hasAttackWord(title)) {
    return NextResponse.json({ error: "Title contains inappropriate content" }, { status: 400 })
  }

  if (hasSensitive(content) || hasAttackWord(content)) {
    return NextResponse.json({ error: "Content contains inappropriate information" }, { status: 400 })
  }

  try {
    const { db } = await import("@/db/client")

    const [company] = await db
      .select({ id: companies.id, reviewStatus: companies.reviewStatus })
      .from(companies)
      .where(and(eq(companies.id, companyId), isNull(companies.deletedAt)))
      .limit(1)

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    if (company.reviewStatus !== "reviewable") {
      return NextResponse.json(
        { error: "Only reviewable companies can be reviewed" },
        { status: 403 }
      )
    }

    // Extract auth user (optional — works without login too)
    const authUser = await getAuthUser()
    let anonProfile = null
    if (authUser) {
      try {
        anonProfile = await getOrCreateAnonymousProfile({
          userId: authUser.userId,
          scope: { scopeType: "company", scopeId: companyId },
          role: authorRole,
        })
      } catch {
        // Non-fatal: continue without anonymous profile
      }
    }

    const authorLabel = ROLE_LABELS[authorRole] ?? "匿名评价者"

    const [row] = await db
      .insert(reviews)
      .values({
        companyId,
        authorUserId: authUser?.userId ?? null,
        anonymousProfileId: anonProfile?.id ?? null,
        authorRole: authorRole as (typeof VALID_ROLES)[number],
        authorLabel,
        title,
        content,
        directionScore: String(directionScore),
        recommendToJoin: body.recommendToJoin != null ? Boolean(body.recommendToJoin) : undefined,
        employmentStatus: body.employmentStatus ? String(body.employmentStatus) : undefined,
        jobTitle: body.jobTitle ? String(body.jobTitle) : undefined,
        city: body.city ? String(body.city) : undefined,
        departmentHint: body.departmentHint ? String(body.departmentHint) : undefined,
        questionnaire: body.questionnaire ?? undefined,
        officeExperienceScore: body.officeExperienceScore != null
          ? String(body.officeExperienceScore)
          : undefined,
        status: "pending_review",
      })
      .returning()

    return NextResponse.json(
      { review: toPublicReviewView(row), message: "评价已提交，等待审核" },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/reviews failed:", error)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }
}

const VISIBLE_STATUSES = ["visible", "limited_visible"] as const

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const companyId = searchParams.get("companyId") ?? undefined
  const sort = (searchParams.get("sort") ?? "latest") as SortMode
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50)
  const rawCursor = searchParams.get("cursor") ?? undefined

  const cursor = rawCursor ? decodeURIComponent(rawCursor) : undefined

  if (sort !== "latest" && sort !== "highest_score" && sort !== "most_helpful") {
    return NextResponse.json(
      { error: "Invalid sort. Must be one of: latest, highest_score, most_helpful" },
      { status: 400 }
    )
  }

  if (limit < 1) {
    return NextResponse.json({ error: "limit must be at least 1" }, { status: 400 })
  }

  try {
    const { db } = await import("@/db/client")

    // Build base conditions
    const conditions = [
      isNull(reviews.deletedAt),
      inArray(reviews.status, VISIBLE_STATUSES),
    ]

    if (companyId) {
      conditions.push(eq(reviews.companyId, companyId))
    }

    // Sort expression
    const orderBy =
      sort === "highest_score"
        ? desc(reviews.directionScore)
        : sort === "most_helpful"
          ? desc(reviews.usefulCount)
          : desc(reviews.createdAt)

    // Cursor condition: only used when cursor is provided
    // We order by (createdAt DESC, id DESC) so cursor provides the id of the last seen row
    const fetchConditions = cursor
      ? and(...conditions, sql`(${reviews.createdAt}, ${reviews.id}) < (SELECT created_at, id FROM reviews WHERE id = ${cursor})`)
      : and(...conditions)

    // Fetch limit + 1 to determine hasMore
    const rows = await db
      .select()
      .from(reviews)
      .where(fetchConditions)
      .orderBy(orderBy, desc(reviews.id))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const resultRows = hasMore ? rows.slice(0, limit) : rows

    const nextCursor = hasMore && resultRows.length > 0 ? resultRows[resultRows.length - 1]!.id : null

    const reviewsList = resultRows.map((row) => {
      const view = toPublicReviewView(row)
      // Extract tags from questionnaire if present
      const tags: string[] | null =
        row.questionnaire && typeof row.questionnaire === "object" && !Array.isArray(row.questionnaire)
          ? ((row.questionnaire as Record<string, unknown>).tags as string[] | undefined) ?? null
          : null

      return {
        id: view.id,
        companyId: view.companyId,
        title: view.title,
        content: view.content,
        summary: view.summary,
        directionScore: view.directionScore,
        recommendToJoin: view.recommendToJoin,
        employmentStatus: view.employmentStatus,
        jobTitle: view.jobTitle,
        city: view.city,
        authorRole: view.authorRole,
        authorLabel: view.authorLabel,
        usefulCount: view.usefulCount,
        discussionCount: view.discussionCount,
        status: view.status,
        createdAt: view.createdAt,
        tags,
      }
    })

    return NextResponse.json({
      reviews: reviewsList,
      nextCursor,
      hasMore,
    })
  } catch (error) {
    console.error("GET /api/reviews failed:", error)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }
}
