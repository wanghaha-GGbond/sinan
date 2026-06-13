import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"

import { users } from "@/db/schema/users"
import { requireModerator } from "@/lib/server/auth"

export async function GET() {
  try {
    await requireModerator()
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }

  try {
    const { db } = await import("@/db/client")
    const rows = await db
      .select({
        userId: users.id,
        displayName: users.displayName,
        highlightMoment: users.highlightMoment,
        declinedOffer: users.declinedOffer,
        profileFieldsStatus: users.profileFieldsStatus,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(
        sql`${users.profileFieldsStatus}->>'highlightMoment' = 'pending'
          OR ${users.profileFieldsStatus}->>'declinedOffer' = 'pending'`
      )
      .limit(100)

    return NextResponse.json({
      submissions: rows.flatMap((row) => {
        const statuses = row.profileFieldsStatus ?? {}
        return [
          statuses.highlightMoment === "pending" && row.highlightMoment
            ? {
                userId: row.userId,
                displayName: row.displayName,
                field: "highlightMoment",
                value: row.highlightMoment,
                updatedAt: row.updatedAt.toISOString(),
              }
            : null,
          statuses.declinedOffer === "pending" && row.declinedOffer
            ? {
                userId: row.userId,
                displayName: row.displayName,
                field: "declinedOffer",
                value: row.declinedOffer,
                updatedAt: row.updatedAt.toISOString(),
              }
            : null,
        ].filter(Boolean)
      }),
    })
  } catch (error) {
    console.error("GET /api/moderation/profile-fields failed:", error)
    return NextResponse.json({ error: "审核队列加载失败" }, { status: 503 })
  }
}
