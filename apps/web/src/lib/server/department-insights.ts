import { and, eq, inArray, isNull, sql } from "drizzle-orm"

import { departments } from "@/db/schema/departments"
import { reviews } from "@/db/schema/reviews"
import { users } from "@/db/schema/users"
import { DEPARTMENT_K_THRESHOLD } from "@/lib/server/anonymity"

export type DepartmentInsight = {
  id: string
  name: string
  verifiedAuthorCount: number
  reviewCount: number
  ratings: {
    pay_worth: number
    growth: number
    leader: number
    overtime_truth: number
    promise_delivery: number
  }
}

export async function getDepartmentInsights(
  companyId: string
): Promise<DepartmentInsight[]> {
  try {
    const { db } = await import("@/db/client")
    const ranked = db
      .select({
        id: departments.id,
        name: departments.name,
        ratings: reviews.ratingDimensions,
        ratingRank: sql<number>`row_number() over (
          partition by ${departments.id}, ${reviews.authorUserId}
          order by ${reviews.createdAt} desc, ${reviews.id} desc
        )`.as("rating_rank"),
      })
      .from(departments)
      .innerJoin(
        reviews,
        and(
          eq(reviews.departmentId, departments.id),
          inArray(reviews.status, ["visible", "limited_visible"]),
          isNull(reviews.deletedAt),
          // Optional quick reviews must not manufacture zero averages or
          // lower the five-author privacy threshold for any dimension.
          sql`${reviews.ratingDimensions} ?& array['pay_worth', 'growth', 'leader', 'overtime_truth', 'promise_delivery']`
        )
      )
      .innerJoin(
        users,
        and(
          eq(users.id, reviews.authorUserId),
          sql`${users.trustLevel} >= 1`
        )
      )
      .where(
        and(
          eq(departments.companyId, companyId),
          eq(departments.status, "active")
        )
      )
      .as("department_ratings")
    const first = sql`${ranked.ratingRank} = 1`
    const authorCount = sql<number>`count(*) filter (where ${first})`
    const average = (dimension: string) =>
      sql<number>`avg((${ranked.ratings}->>${dimension})::numeric) filter (where ${first})`
    const rows = await db.select({
      id: ranked.id,
      name: ranked.name,
      verifiedAuthorCount: authorCount,
      reviewCount: sql<number>`count(*)`,
      payWorth: average("pay_worth"),
      growth: average("growth"),
      leader: average("leader"),
      overtimeTruth: average("overtime_truth"),
      promiseDelivery: average("promise_delivery"),
    }).from(ranked)
      .groupBy(ranked.id, ranked.name)
      .having(sql`${authorCount} >= ${DEPARTMENT_K_THRESHOLD}`)

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      verifiedAuthorCount: Number(row.verifiedAuthorCount),
      reviewCount: Number(row.reviewCount),
      ratings: {
        pay_worth: Number(Number(row.payWorth ?? 0).toFixed(1)),
        growth: Number(Number(row.growth ?? 0).toFixed(1)),
        leader: Number(Number(row.leader ?? 0).toFixed(1)),
        overtime_truth: Number(Number(row.overtimeTruth ?? 0).toFixed(1)),
        promise_delivery: Number(Number(row.promiseDelivery ?? 0).toFixed(1)),
      },
    }))
  } catch {
    return []
  }
}
