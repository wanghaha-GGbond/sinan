import { NextResponse } from "next/server"
import { and, gte, inArray, isNull, sql } from "drizzle-orm"

import { companySentimentDaily } from "@/db/schema/company-sentiment"
import { reviews } from "@/db/schema/reviews"

export async function GET(request: Request) {
  const secret = request.headers.get("authorization")
  if (!process.env.CRON_SECRET || secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { db } = await import("@/db/client")
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const day = new Date().toISOString().slice(0, 10)
    const rows = await db
      .select({
        companyId: reviews.companyId,
        sampleCount: sql<number>`count(*)`,
        dimensionAverage: sql<number>`avg((
          (${reviews.ratingDimensions}->>'pay_worth')::numeric +
          (${reviews.ratingDimensions}->>'growth')::numeric +
          (${reviews.ratingDimensions}->>'leader')::numeric +
          (${reviews.ratingDimensions}->>'overtime_truth')::numeric +
          (${reviews.ratingDimensions}->>'promise_delivery')::numeric
        ) / 5.0)`,
        usefulTotal: sql<number>`sum(${reviews.usefulCount})`,
      })
      .from(reviews)
      .where(
        and(
          gte(reviews.createdAt, since),
          inArray(reviews.status, ["visible", "limited_visible"]),
          isNull(reviews.deletedAt),
          sql`${reviews.ratingDimensions} IS NOT NULL`
        )
      )
      .groupBy(reviews.companyId)

    for (const row of rows) {
      const dimensionScore = Number(row.dimensionAverage ?? 0) * 20
      const activityBoost = Math.min(10, Math.log2(Number(row.sampleCount) + 1) * 3)
      const usefulBoost = Math.min(5, Math.log2(Number(row.usefulTotal ?? 0) + 1))
      const score = Math.max(0, Math.min(100, dimensionScore * 0.85 + activityBoost + usefulBoost))
      await db
        .insert(companySentimentDaily)
        .values({
          companyId: row.companyId,
          date: day,
          score: score.toFixed(1),
          sampleCount: Number(row.sampleCount),
          components: {
            dimensions: Number(dimensionScore.toFixed(1)),
            activity: Number(activityBoost.toFixed(1)),
            useful: Number(usefulBoost.toFixed(1)),
          },
        })
        .onConflictDoUpdate({
          target: [companySentimentDaily.companyId, companySentimentDaily.date],
          set: {
            score: score.toFixed(1),
            sampleCount: Number(row.sampleCount),
            components: {
              dimensions: Number(dimensionScore.toFixed(1)),
              activity: Number(activityBoost.toFixed(1)),
              useful: Number(usefulBoost.toFixed(1)),
            },
            updatedAt: new Date(),
          },
        })
    }

    return NextResponse.json({ date: day, companiesUpdated: rows.length })
  } catch (error) {
    console.error("sentiment cron failed:", error)
    return NextResponse.json({ error: "Aggregation failed" }, { status: 503 })
  }
}
