import { NextRequest, NextResponse } from "next/server"
import { and, eq, inArray, isNull, desc, gte, lt, or, sql } from "drizzle-orm"
import { z } from "zod"
import { companies } from "@/db/schema/companies"
import { reviews } from "@/db/schema/reviews"
import { toPublicReviewView } from "@/lib/server/review-view"
import { getAuthUserFromRequest } from "@/lib/server/auth"
import { getOrCreateAnonymousProfile } from "@/lib/server/anonymous-profile"
import { hasSensitive, hasAttackWord } from "@/lib/content-guard"
import { departments } from "@/db/schema/departments"
import { reviewRatingDimensionsSchema } from "@/lib/review-ratings"
import { extractPublicDimensionScores } from "@/lib/review-questionnaire"
import { getRateLimitKey } from "@/lib/server/rate-limit"
import { checkPersistentRateLimit } from "@/lib/server/persistent-rate-limit"
import {
  getBlockedReviewAuthorKeys,
  getPublicReviewMetadata,
  isReviewAuthorBlocked,
} from "@/lib/server/public-review-query"

type SortMode = "latest" | "highest_score" | "most_helpful"

type ReviewCursor = {
  score: number
  usefulCount: number
  createdAt: Date
  id: string
}

function encodeReviewCursor(
  sort: SortMode,
  row: { directionScore: unknown; usefulCount: number; createdAt: Date; id: string },
): string {
  const score = Number(row.directionScore)
  const payload = sort === "latest"
    ? `${row.createdAt.getTime()}|${row.id}`
    : sort === "highest_score"
      ? `${score}|${row.createdAt.getTime()}|${row.id}`
      : `${row.usefulCount}|${row.createdAt.getTime()}|${row.id}`
  return Buffer.from(payload, "utf8").toString("base64url")
}

function decodeReviewCursor(sort: SortMode, raw: string): ReviewCursor | null {
  try {
    const payload = Buffer.from(raw, "base64url").toString("utf8")
    const parts = payload.split("|")
    const id = parts.at(-1)
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null

    if (sort === "latest") {
      if (parts.length !== 2) return null
      const timestamp = Number(parts[0])
      const createdAt = new Date(timestamp)
      if (!Number.isFinite(timestamp) || Number.isNaN(createdAt.getTime())) return null
      return { score: 0, usefulCount: 0, createdAt, id }
    }

    if (parts.length !== 3) return null
    const primary = Number(parts[0])
    const timestamp = Number(parts[1])
    const createdAt = new Date(timestamp)
    if (
      !Number.isFinite(primary) ||
      !Number.isFinite(timestamp) ||
      Number.isNaN(createdAt.getTime())
    ) return null
    return sort === "highest_score"
      ? { score: primary, usefulCount: 0, createdAt, id }
      : { score: 0, usefulCount: primary, createdAt, id }
  } catch {
    return null
  }
}

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

const score10 = z.number().finite().min(0).max(10)
const questionnaireSchema = z.object({
  tags: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
  salaryRange: z.string().trim().max(120).nullable().optional(),
  interviewDifficulty: score10.optional(),
  interviewExperienceScore: score10.optional(),
  salaryScore: score10.optional(),
  growthScore: score10.optional(),
  workLifeBalanceScore: score10.optional(),
  managementClarityScore: score10.optional(),
  collaborationScore: score10.optional(),
  stabilityScore: score10.optional(),
  integrityScore: score10.optional(),
  canteenScore: score10.optional(),
  officeEnvironmentScore: score10.optional(),
  restroomScore: score10.optional(),
  afternoonTeaScore: score10.optional(),
  workstationComfortScore: score10.optional(),
  commuteConvenienceScore: score10.optional(),
  officeEquipmentScore: score10.optional(),
  overallOfficeExperienceScore: score10.optional(),
  companyPace: z.enum(["very_fast", "fast", "stable", "very_stable"]).optional(),
  managementStyle: z.enum(["flexible", "balanced_process", "process_clear", "process_heavy"]).optional(),
  growthExperience: z.enum(["very_fast", "team_dependent", "average", "limited"]).optional(),
  collaborationStyle: z.enum(["cross_team", "within_team", "individual", "high_friction"]).optional(),
  overtimeLevel: z.enum(["very_high", "high", "normal", "low"]).optional(),
  promiseKeeping: z.enum(["mostly_kept", "partially_kept", "often_changed", "unknown"]).optional(),
}).strict()

const reviewSubmissionSchema = z.object({
  companyId: z.string().trim().min(1).max(120),
  authorRole: z.enum(VALID_ROLES).default("anonymous"),
  title: z.string().trim().min(2).max(80),
  content: z.string().trim().min(20).max(3000),
  directionScore: score10,
  departmentId: z.string().trim().min(1).max(120).nullable().optional(),
  recommendToJoin: z.boolean().nullable().optional(),
  employmentStatus: z.string().trim().max(40).nullable().optional(),
  jobTitle: z.string().trim().max(120).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  departmentHint: z.string().trim().max(120).nullable().optional(),
  questionnaire: questionnaireSchema.nullable().optional(),
  ratingDimensions: reviewRatingDimensionsSchema,
  officeExperienceScore: score10.nullable().optional(),
}).strict()

export async function POST(request: NextRequest) {
  const authUser = await getAuthUserFromRequest(request)
  if (!authUser) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    )
  }

  const [userLimit, ipLimit] = await Promise.all([
    checkPersistentRateLimit(
      `review-submit:user:${authUser.userId}`,
      { maxRequests: 5, windowSeconds: 24 * 60 * 60 },
    ),
    checkPersistentRateLimit(
      `review-submit:ip:${getRateLimitKey(request, "/api/reviews")}`,
      { maxRequests: 20, windowSeconds: 24 * 60 * 60 },
    ),
  ])
  if (!userLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json(
      {
        error: "评价提交过于频繁，请稍后再试",
        retryAfter: Math.max(
          userLimit.allowed ? 0 : userLimit.retryAfter,
          ipLimit.allowed ? 0 : ipLimit.retryAfter,
        ),
      },
      { status: 429 },
    )
  }

  const contentLength = Number(request.headers.get("content-length") ?? "")
  if (Number.isFinite(contentLength) && contentLength > 128 * 1024) {
    return NextResponse.json({ error: "评价请求过大" }, { status: 413 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = reviewSubmissionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "评价参数不正确" },
      { status: 400 }
    )
  }

  const data = parsed.data
  const derivedRecommendToJoin = data.directionScore >= 7
  if (
    data.recommendToJoin != null &&
    data.recommendToJoin !== derivedRecommendToJoin
  ) {
    return NextResponse.json(
      { error: "recommendToJoin must match directionScore" },
      { status: 400 },
    )
  }

  if (hasSensitive(data.title) || hasAttackWord(data.title)) {
    return NextResponse.json({ error: "Title contains inappropriate content" }, { status: 400 })
  }

  if (hasSensitive(data.content) || hasAttackWord(data.content)) {
    return NextResponse.json({ error: "Content contains inappropriate information" }, { status: 400 })
  }

  const publicMetadata = [
    data.employmentStatus,
    data.jobTitle,
    data.city,
    data.departmentHint,
  ].filter((value): value is string => Boolean(value))
  const questionnaireText = data.questionnaire ? JSON.stringify(data.questionnaire) : ""
  if (
    publicMetadata.some((value) => hasSensitive(value) || hasAttackWord(value)) ||
    hasSensitive(questionnaireText) ||
    hasAttackWord(questionnaireText)
  ) {
    return NextResponse.json(
      { error: "评价附加信息包含不适合公开展示的内容" },
      { status: 400 },
    )
  }

  try {
    const { db } = await import("@/db/client")

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [recentSubmissionCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviews)
      .where(
        and(
          eq(reviews.authorUserId, authUser.userId),
          gte(reviews.createdAt, oneDayAgo),
          isNull(reviews.deletedAt),
        ),
      )
    if (Number(recentSubmissionCount?.count ?? 0) >= 5) {
      return NextResponse.json(
        { error: "Daily review submission limit reached" },
        { status: 429 },
      )
    }

    const [company] = await db
      .select({ id: companies.id, reviewStatus: companies.reviewStatus })
      .from(companies)
      .where(and(eq(companies.id, data.companyId), isNull(companies.deletedAt)))
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

    if (data.departmentId) {
      const [department] = await db
        .select({ id: departments.id })
        .from(departments)
        .where(
          and(
            eq(departments.id, data.departmentId),
            eq(departments.companyId, data.companyId),
            eq(departments.status, "active")
          )
        )
        .limit(1)
      if (!department) {
        return NextResponse.json({ error: "所选部门不存在" }, { status: 400 })
      }
    }

    let anonProfile = null
    try {
      anonProfile = await getOrCreateAnonymousProfile({
        userId: authUser.userId,
        scope: { scopeType: "company", scopeId: data.companyId },
        role: data.authorRole,
      })
    } catch {
      // Non-fatal: the review remains linked to the private account id while
      // public serializers continue to expose only the anonymous role label.
    }

    const authorLabel = ROLE_LABELS[data.authorRole] ?? "匿名评价者"

    const [row] = await db
      .insert(reviews)
      .values({
        companyId: data.companyId,
        departmentId: data.departmentId ?? null,
        authorUserId: authUser.userId,
        anonymousProfileId: anonProfile?.id ?? null,
        authorRole: data.authorRole,
        authorLabel,
        title: data.title,
        content: data.content,
        directionScore: String(data.directionScore),
        recommendToJoin: derivedRecommendToJoin,
        employmentStatus: data.employmentStatus ?? undefined,
        jobTitle: data.jobTitle ?? undefined,
        city: data.city ?? undefined,
        departmentHint: data.departmentHint ?? undefined,
        questionnaire: data.questionnaire ?? undefined,
        ratingDimensions: data.ratingDimensions,
        officeExperienceScore: data.officeExperienceScore != null
          ? String(data.officeExperienceScore)
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

  if (sort !== "latest" && sort !== "highest_score" && sort !== "most_helpful") {
    return NextResponse.json(
      { error: "Invalid sort. Must be one of: latest, highest_score, most_helpful" },
      { status: 400 }
    )
  }

  if (!Number.isFinite(limit) || limit < 1) {
    return NextResponse.json({ error: "limit must be between 1 and 50" }, { status: 400 })
  }

  const cursor = rawCursor ? decodeReviewCursor(sort, rawCursor) : null
  if (rawCursor && !cursor) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 })
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

    // The cursor and order use the same complete tuple for every sort mode.
    const orderBy =
      sort === "highest_score"
        ? [desc(reviews.directionScore), desc(reviews.createdAt), desc(reviews.id)]
        : sort === "most_helpful"
          ? [desc(reviews.usefulCount), desc(reviews.createdAt), desc(reviews.id)]
          : [desc(reviews.createdAt), desc(reviews.id)]

    if (cursor) {
      if (sort === "latest") {
        conditions.push(
          or(
            lt(reviews.createdAt, cursor.createdAt),
            and(
              eq(reviews.createdAt, cursor.createdAt),
              lt(reviews.id, cursor.id),
            ),
          )!,
        )
      } else if (sort === "highest_score") {
        conditions.push(
          or(
            lt(reviews.directionScore, String(cursor.score)),
            and(
              eq(reviews.directionScore, String(cursor.score)),
              lt(reviews.createdAt, cursor.createdAt),
            ),
            and(
              eq(reviews.directionScore, String(cursor.score)),
              eq(reviews.createdAt, cursor.createdAt),
              lt(reviews.id, cursor.id),
            ),
          )!,
        )
      } else {
        conditions.push(
          or(
            lt(reviews.usefulCount, cursor.usefulCount),
            and(
              eq(reviews.usefulCount, cursor.usefulCount),
              lt(reviews.createdAt, cursor.createdAt),
            ),
            and(
              eq(reviews.usefulCount, cursor.usefulCount),
              eq(reviews.createdAt, cursor.createdAt),
              lt(reviews.id, cursor.id),
            ),
          )!,
        )
      }
    }

    // Fetch limit + 1 to determine hasMore
    const rows = await db
      .select()
      .from(reviews)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const resultRows = hasMore ? rows.slice(0, limit) : rows

    const nextCursor = hasMore && resultRows.length > 0
      ? encodeReviewCursor(sort, resultRows[resultRows.length - 1]!)
      : null

    const authUser = await getAuthUserFromRequest(request)
    const blockedAuthors = await getBlockedReviewAuthorKeys(authUser?.userId)
    const visibleRows = resultRows.filter((row) => !isReviewAuthorBlocked(row, blockedAuthors))
    const metadata = await getPublicReviewMetadata(visibleRows, authUser?.userId)
    const reviewsList = visibleRows.map((row) => {
      const view = toPublicReviewView(row, metadata.get(row.id))
      // Extract tags from questionnaire if present
      const tags: string[] | null = view.tags.length > 0 ? view.tags : null

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
        isUsefulByCurrentUser: view.isUsefulByCurrentUser,
        discussionCount: view.discussionCount,
        dimensionScores: extractPublicDimensionScores(row.questionnaire),
        publicAuthor: view.publicAuthor,
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
