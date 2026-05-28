import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { companies } from "@/db/schema/companies"
import { reviews } from "@/db/schema/reviews"
import { toPublicReviewView } from "@/lib/server/review-view"

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

const phonePattern = /1[3-9]\d{9}/
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const idCardPattern = /\d{17}[\dXx]/
const attackWords = [
  "垃圾", "傻逼", "黑心", "压榨", "坑人", "骗子",
  "狗公司", "曝光", "挂人", "爆雷",
]

function hasSensitive(value: string) {
  return phonePattern.test(value) || emailPattern.test(value) || idCardPattern.test(value)
}

function hasAttackWord(value: string) {
  return attackWords.some((word) => value.includes(word))
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

  // Validate required fields
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
    return NextResponse.json(
      { error: "Title must be 2–80 characters" },
      { status: 400 }
    )
  }

  if (content.length < 20 || content.length > 3000) {
    return NextResponse.json(
      { error: "Content must be 20–3000 characters" },
      { status: 400 }
    )
  }

  if (isNaN(directionScore) || directionScore < 0 || directionScore > 10) {
    return NextResponse.json(
      { error: "directionScore must be 0–10" },
      { status: 400 }
    )
  }

  // Content safety
  if (hasSensitive(title) || hasAttackWord(title)) {
    return NextResponse.json(
      { error: "Title contains inappropriate content" },
      { status: 400 }
    )
  }

  if (hasSensitive(content) || hasAttackWord(content)) {
    return NextResponse.json(
      { error: "Content contains inappropriate information" },
      { status: 400 }
    )
  }

  try {
    const { db } = await import("@/db/client")

    // Verify company is reviewable
    const [company] = await db
      .select({
        id: companies.id,
        reviewStatus: companies.reviewStatus,
      })
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

    const authorLabel = ROLE_LABELS[authorRole] ?? "匿名评价者"

    const [row] = await db
      .insert(reviews)
      .values({
        companyId,
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
      {
        review: toPublicReviewView(row),
        message: "评价已提交，等待审核",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/reviews failed:", error)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    )
  }
}
