import { NextResponse } from "next/server"
import { and, asc, eq, gte } from "drizzle-orm"

import { companyEvents, companySentimentDaily } from "@/db/schema/company-sentiment"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { db } = await import("@/db/client")
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    const [points, events] = await Promise.all([
      db
        .select({
          date: companySentimentDaily.date,
          score: companySentimentDaily.score,
          sampleCount: companySentimentDaily.sampleCount,
        })
        .from(companySentimentDaily)
        .where(
          and(
            eq(companySentimentDaily.companyId, id),
            gte(companySentimentDaily.date, since)
          )
        )
        .orderBy(asc(companySentimentDaily.date)),
      db
        .select({
          date: companyEvents.eventDate,
          title: companyEvents.title,
          category: companyEvents.category,
          sourceUrl: companyEvents.sourceUrl,
        })
        .from(companyEvents)
        .where(and(eq(companyEvents.companyId, id), gte(companyEvents.eventDate, since)))
        .orderBy(asc(companyEvents.eventDate)),
    ])
    return NextResponse.json({
      points: points.map((point) => ({ ...point, score: Number(point.score) })),
      events,
    })
  } catch {
    return NextResponse.json({ points: [], events: [] })
  }
}
