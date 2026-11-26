import { and, desc, eq, isNull, sql } from "drizzle-orm"
import { z } from "zod"
import { companies } from "@/db/schema/companies"
import { reviews } from "@/db/schema/reviews"
import type { MyReviewPage } from "@/lib/my-reviews"

const PAGE_SIZE = 20
const cursorSchema = z.object({ at: z.iso.datetime(), id: z.uuid() }).strict()
type Cursor = z.infer<typeof cursorSchema>

export function parseMyReviewCursor(value: string): Cursor | undefined {
  if (value.length > 240 || !/^[A-Za-z0-9_-]+$/.test(value)) return undefined
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")))
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}

export async function getMyReviewPage(userId: string, cursor?: Cursor): Promise<MyReviewPage & { totalUseful: number }> {
  const { db } = await import("@/db/client")
  const rows = await db.select({
    id: reviews.id,
    companyId: reviews.companyId,
    companyName: companies.name,
    title: reviews.title,
    score: reviews.directionScore,
    shortComment: reviews.summary,
    helpful: reviews.usefulCount,
    commentCount: reviews.discussionCount,
    // PostgreSQL keeps microseconds; a JavaScript Date cursor would lose rows
    // around page boundaries. Keep the database precision in the cursor.
    createdAt: sql<string>`to_char(${reviews.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
    totalUseful: cursor ? sql<number>`0` : sql<number>`sum(${reviews.usefulCount}) over ()`,
  }).from(reviews)
    .innerJoin(companies, eq(reviews.companyId, companies.id))
    .where(and(
      eq(reviews.authorUserId, userId),
      isNull(reviews.deletedAt),
      cursor ? sql`(${reviews.createdAt}, ${reviews.id}) < (${cursor.at}::timestamptz, ${cursor.id}::uuid)` : undefined,
    ))
    .orderBy(desc(reviews.createdAt), desc(reviews.id))
    .limit(PAGE_SIZE + 1)

  const page = rows.slice(0, PAGE_SIZE), last = page.at(-1)
  return {
    reviews: page.map((row) => ({
      id: row.id, companyId: row.companyId, companyName: row.companyName, title: row.title,
      score: Number(row.score), shortComment: row.shortComment ?? "", helpful: row.helpful,
      commentCount: row.commentCount, createdAt: new Date(row.createdAt).toISOString(),
    })),
    nextCursor: rows.length > PAGE_SIZE && last
      ? Buffer.from(JSON.stringify({ at: last.createdAt, id: last.id })).toString("base64url")
      : null,
    totalUseful: Number(rows[0]?.totalUseful ?? 0),
  }
}
