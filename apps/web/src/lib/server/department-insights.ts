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
    const rows = await db
      .select({
        id: departments.id,
        name: departments.name,
        verifiedAuthorCount: sql<number>`count(distinct ${reviews.authorUserId})`,
        reviewCount: sql<number>`count(${reviews.id})`,
        payWorth: sql<number>`avg((${reviews.ratingDimensions}->>'pay_worth')::numeric)`,
        growth: sql<number>`avg((${reviews.ratingDimensions}->>'growth')::numeric)`,
        leader: sql<number>`avg((${reviews.ratingDimensions}->>'leader')::numeric)`,
        overtimeTruth: sql<number>`avg((${reviews.ratingDimensions}->>'overtime_truth')::numeric)`,
        promiseDelivery: sql<number>`avg((${reviews.ratingDimensions}->>'promise_delivery')::numeric)`,
      })
      .from(departments)
      .innerJoin(
        reviews,
        and(
          eq(reviews.departmentId, departments.id),
          inArray(reviews.status, ["visible", "limited_visible"]),
          isNull(reviews.deletedAt)
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
      .groupBy(departments.id, departments.name)
      .having(
        sql`count(distinct ${reviews.authorUserId}) >= ${DEPARTMENT_K_THRESHOLD}`
      )

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
