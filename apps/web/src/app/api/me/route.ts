import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/server/auth"

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
  return [
    {
      id: "task-read-review",
      title: "阅读一篇点评",
      rewardPoints: 5,
      progress: 0,
      target: 1,
      completed: false,
      href: "/search",
      hint: "帮助他人做出更好的选择",
    },
    {
      id: "task-write-review",
      title: "撰写一篇公司点评",
      rewardPoints: 20,
      progress: 0,
      target: 1,
      completed: false,
      hint: "分享你的职场经验",
    },
    {
      id: "task-useful-vote",
      title: "对 3 篇点评点有帮助",
      rewardPoints: 10,
      progress: 0,
      target: 3,
      completed: false,
      hint: "发现有价值的点评",
    },
    {
      id: "task-complete-profile",
      title: "完善个人资料",
      rewardPoints: 15,
      progress: 0,
      target: 1,
      completed: false,
      hint: "让社区更了解你",
    },
    {
      id: "task-invite-friend",
      title: "邀请好友加入指路人",
      rewardPoints: 30,
      progress: 0,
      target: 1,
      completed: false,
      hint: "分享指路人给他人",
    },
  ]
}

function getDefaultBadges(): Badge[] {
  return [
    {
      id: "badge-first-review",
      name: "初来乍到",
      description: "撰写第一篇公司点评",
      unlocked: false,
      progress: 0,
      target: 1,
    },
    {
      id: "badge-review-5",
      name: "点评新星",
      description: "累计撰写 5 篇点评",
      unlocked: false,
      progress: 0,
      target: 5,
    },
    {
      id: "badge-review-20",
      name: "资深指路人",
      description: "累计撰写 20 篇点评",
      unlocked: false,
      progress: 0,
      target: 20,
    },
    {
      id: "badge-helpful-10",
      name: "慧眼识珠",
      description: "累计给 10 篇点评点有帮助",
      unlocked: false,
      progress: 0,
      target: 10,
    },
    {
      id: "badge-helpful-50",
      name: "伯乐之眼",
      description: "累计给 50 篇点评点有帮助",
      unlocked: false,
      progress: 0,
      target: 50,
    },
    {
      id: "badge-streak-7",
      name: "连续 7 天",
      description: "连续 7 天完成每日任务",
      unlocked: false,
      progress: 0,
      target: 7,
    },
    {
      id: "badge-streak-30",
      name: "坚持不懈",
      description: "连续 30 天完成每日任务",
      unlocked: false,
      progress: 0,
      target: 30,
    },
    {
      id: "badge-trust-level-2",
      name: "信任新星",
      description: "信任等级达到 2 级",
      unlocked: false,
      progress: 0,
      target: 2,
    },
    {
      id: "badge-trust-level-5",
      name: "值得信赖",
      description: "信任等级达到 5 级",
      unlocked: false,
      progress: 0,
      target: 5,
    },
    {
      id: "badge-early-adopter",
      name: "先驱者",
      description: "在产品早期加入指路人",
      unlocked: false,
    },
  ]
}

// ---------------------------------------------------------------------------
// GET /api/me — user dashboard aggregation
// ---------------------------------------------------------------------------

export async function GET() {
  const authUser = await getAuthUser()

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
        profileFieldsStatus: users.profileFieldsStatus,
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
      const fieldStatus = row.profileFieldsStatus ?? {}
      dbUser = {
        id: row.id,
        displayName: row.displayName,
        role: row.role,
        trustLevel: row.trustLevel ?? 0,
        reputationScore: row.reputationScore ?? 0,
        jobBand: row.jobBand,
        yearsOfExperience: row.yearsOfExperience,
        highlightMoment:
          fieldStatus.highlightMoment === "approved" ? row.highlightMoment : null,
        declinedOffer:
          fieldStatus.declinedOffer === "approved" ? row.declinedOffer : null,
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
    // DB unavailable — return safe defaults
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
