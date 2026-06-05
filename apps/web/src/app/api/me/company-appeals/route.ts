import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq, sql } from "drizzle-orm"
import { companyAppeals } from "@/db/schema/company-appeals"
import { getAuthUser } from "@/lib/server/auth"

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

/**
 * GET /api/me/company-appeals
 *
 * List the current visitor's appeals. Optional ?companyId / ?reviewId
 * filters narrow the scope. Anonymous visitors (no auth) are matched
 * by fingerprint.
 */
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser()
  const fingerprint =
    request.headers.get("x-sinan-fingerprint") ??
    request.cookies.get("sinan_anon_fp")?.value ??
    null

  if (!authUser && !fingerprint) {
    return NextResponse.json(
      { error: "Login or fingerprint required" },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get("companyId")
  const reviewId = searchParams.get("reviewId")
  const limit = Math.min(
    Number(searchParams.get("limit") ?? DEFAULT_LIMIT),
    MAX_LIMIT
  )
  const cursor = searchParams.get("cursor") ?? undefined

  try {
    const { db } = await import("@/db/client")

    const conditions: ReturnType<typeof and>[] = []
    if (authUser) {
      conditions.push(eq(companyAppeals.submitterUserId, authUser.userId))
    } else {
      conditions.push(eq(companyAppeals.submitterFingerprintHash, fingerprint!))
    }
    if (companyId) {
      conditions.push(eq(companyAppeals.companyId, companyId))
    }
    if (reviewId) {
      conditions.push(eq(companyAppeals.reviewId, reviewId))
    }
    if (cursor) {
      conditions.push(sql`${companyAppeals.id} < ${cursor}`)
    }

    const rows = await db
      .select()
      .from(companyAppeals)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(companyAppeals.createdAt), desc(companyAppeals.id))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const slice = hasMore ? rows.slice(0, limit) : rows
    const nextCursor = hasMore ? slice[slice.length - 1].id : null

    return NextResponse.json(
      {
        appeals: slice.map((row) => ({
          id: row.id,
          companyId: row.companyId,
          reviewId: row.reviewId,
          reason: row.reason,
          note: row.note,
          status: row.status,
          moderationNote: row.moderationNote,
          actionedAt: row.actionedAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
        })),
        nextCursor,
        hasMore,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[company-appeals] GET failed", error)
    return NextResponse.json(
      { error: "Internal error listing appeals" },
      { status: 500 }
    )
  }
}
