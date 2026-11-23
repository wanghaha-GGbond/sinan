import { NextRequest, NextResponse } from "next/server"
import { getAuthUserFromRequest } from "@/lib/server/auth"
import { checkRateLimit, getRateLimitKey } from "@/lib/server/rate-limit"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DashboardUser = {
  id: string
  displayName: string | null
  role: string
  trustLevel: number
  reputationScore: number
  jobBand: string | null
  yearsOfExperience: number | null
  highlightMoment: string | null
  declinedOffer: string | null
  companyName: string | null
  inviterName: string | null
  usefulCount?: number
}

type Stats = {
  directionPoints: number
  nextLevelPoints: number
  streakDays: number
  helpedCount: number
}

type DailyTask = {
  id: string
  title: string
  rewardPoints: number
  progress: number
  target: number
  completed: boolean
  href?: string
  hint?: string
}

type Badge = {
  id: string
  name: string
  description: string
  unlocked: boolean
  progress?: number
  target?: number
}

type MyReview = {
  id: string
  companyId: string
  companyName: string
  title: string
  score: number
  shortComment: string
  helpful: number
  commentCount: number
  createdAt: string
}

type FavoriteCompany = {
  companyId: string
  companyName: string
  createdAt: string
}

type VerificationSummary = {
  id: string
  companyName: string
  proofType: string
  status: string
  createdAt: string
}

type InviteStats = {
  total: number
  used: number
  unused: Array<{ id: string; code: string; status: string; createdAt: string }>
}

type DashboardResponse = {
  user: DashboardUser | null
  stats: Stats
  dailyTasks: DailyTask[]
  badges: Badge[]
  myReviews: MyReview[]
  favoriteCompanies: FavoriteCompany[]
  verifications: VerificationSummary[]
  invites: InviteStats
}

// ---------------------------------------------------------------------------
// Static data (v1 — replace with real services when ready)
// ---------------------------------------------------------------------------

function getDefaultStats(): Stats {
  return {
    directionPoints: 0,
    nextLevelPoints: 100,
    streakDays: 0,
    helpedCount: 0,
  }
}

function getDefaultDailyTasks(): DailyTask[] {
  // Unimplemented gamification must not advertise fictional rewards or progress.
  return []
}

function getDefaultBadges(): Badge[] {
  // Unimplemented gamification must not advertise fictional rewards or progress.
  return []
}

// ---------------------------------------------------------------------------
// GET /api/me — user dashboard aggregation
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // Dashboard aggregator fans out to ~6 sequential queries. Cap per-IP
  // so a misbehaving client can't pin the connection pool.
  const rl = checkRateLimit(
    `me-dashboard:${getRateLimitKey(request, "/api/me")}`,
    { maxRequests: 60, windowSeconds: 60 }
  )
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rl.retryAfter },
      { status: 429 }
    )
  }

  const authUser = await getAuthUserFromRequest(request)

  // Default fallback when not authenticated
  const emptyResponse = (): DashboardResponse => ({
    user: null,
    stats: getDefaultStats(),
    dailyTasks: getDefaultDailyTasks(),
    badges: getDefaultBadges(),
    myReviews: [],
    favoriteCompanies: [],
    verifications: [],
    invites: { total: 0, used: 0, unused: [] },
  })

  if (!authUser) {
    return NextResponse.json(emptyResponse())
  }

  let dbUser: DashboardUser | null = null
  let myReviews: MyReview[] = []
  let verifications: VerificationSummary[] = []
  let invites: InviteStats = { total: 0, used: 0, unused: [] }

  try {
    const { db } = await import("@/db/client")
    const { users } = await import("@/db/schema/users")
    const { reviews } = await import("@/db/schema/reviews")
    const { companies } = await import("@/db/schema/companies")
    const { companyVerifications } = await import("@/db/schema/company-verifications")
    const { eq, desc, and } = await import("drizzle-orm")

    // Fetch user profile from DB
    const [row] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        role: users.role,
        trustLevel: users.trustLevel,
        reputationScore: users.reputationScore,
        jobBand: users.jobBand,
        yearsOfExperience: users.yearsOfExperience,
        highlightMoment: users.highlightMoment,
        declinedOffer: users.declinedOffer,
        inviterUserId: users.inviterUserId,
      })
      .from(users)
      .where(eq(users.id, authUser.userId))
      .limit(1)

    if (row) {
      const [approvedCompany] = await db
        .select({ companyName: companyVerifications.companyName })
        .from(companyVerifications)
        .where(
          and(
            eq(companyVerifications.applicantUserId, authUser.userId),
            eq(companyVerifications.status, "approved")
          )
        )
        .orderBy(desc(companyVerifications.reviewedAt))
        .limit(1)
      let inviterName: string | null = null
      if (row.inviterUserId) {
        const [inviter] = await db
          .select({ displayName: users.displayName })
          .from(users)
          .where(eq(users.id, row.inviterUserId))
          .limit(1)
        inviterName = inviter?.displayName ?? null
      }
      dbUser = {
        id: row.id,
        displayName: row.displayName,
        role: row.role,
        trustLevel: row.trustLevel ?? 0,
        reputationScore: row.reputationScore ?? 0,
        jobBand: row.jobBand,
        yearsOfExperience: row.yearsOfExperience,
        // This response is owner-only. Preserve pending drafts in the editor;
        // the public profile endpoint independently filters unapproved fields.
        highlightMoment: row.highlightMoment,
        declinedOffer: row.declinedOffer,
        companyName: approvedCompany?.companyName ?? null,
        inviterName,
      }
    }

    // Fetch user's reviews with company name
    const reviewRows = await db
      .select({
        id: reviews.id,
        companyId: reviews.companyId,
        companyName: companies.name,
        title: reviews.title,
        directionScore: reviews.directionScore,
        summary: reviews.summary,
        usefulCount: reviews.usefulCount,
        discussionCount: reviews.discussionCount,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .innerJoin(companies, eq(reviews.companyId, companies.id))
      .where(eq(reviews.authorUserId, authUser.userId))
      .orderBy(reviews.createdAt)
      .limit(20)

    myReviews = reviewRows.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      companyName: r.companyName,
      title: r.title,
      score: Number(r.directionScore),
      shortComment: r.summary ?? "",
      helpful: r.usefulCount ?? 0,
      commentCount: r.discussionCount ?? 0,
      createdAt: r.createdAt?.toISOString() ?? "",
    }))

    if (dbUser) {
      dbUser.usefulCount = myReviews.reduce((total, review) => total + review.helpful, 0)
    }

    const verifRows = await db
      .select({
        id: companyVerifications.id,
        companyName: companyVerifications.companyName,
        proofType: companyVerifications.proofType,
        status: companyVerifications.status,
        createdAt: companyVerifications.createdAt,
      })
      .from(companyVerifications)
      .where(eq(companyVerifications.applicantUserId, authUser.userId))
      .orderBy(desc(companyVerifications.createdAt))
      .limit(10)

    verifications = verifRows.map((v) => ({
      id: v.id,
      companyName: v.companyName,
      proofType: v.proofType,
      status: v.status,
      createdAt: v.createdAt.toISOString(),
    }))

    // Invite stats
    const { getInviteStats } = await import("@/lib/server/invites")
    const inviteData = await getInviteStats(authUser.userId)
    invites = {
      total: inviteData.total,
      used: inviteData.used,
      unused: inviteData.unused.map((row) => ({
        id: row.id,
        code: row.code,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
    }
  } catch {
    // A deployed dashboard must not turn a database outage into a successful
    // response containing fabricated account state. Local development can
    // still render the static shell while the database is being configured.
    if (process.env.NEXT_PUBLIC_APP_ENV === "staging" || process.env.NEXT_PUBLIC_APP_ENV === "production") {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }
    dbUser = null
    myReviews = []
    verifications = []
    invites = { total: 0, used: 0, unused: [] }
  }

  return NextResponse.json({
    user: dbUser,
    stats: getDefaultStats(),
    dailyTasks: getDefaultDailyTasks(),
    badges: getDefaultBadges(),
    myReviews,
    favoriteCompanies: [],
    verifications,
    invites,
  } satisfies DashboardResponse)
}
