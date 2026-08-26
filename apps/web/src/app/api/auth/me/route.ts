import { NextRequest, NextResponse } from "next/server"
import { getAuthUserFromRequest } from "@/lib/server/auth"

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request)

  if (!user) {
    return NextResponse.json({ user: null })
  }

  try {
    const { db } = await import("@/db/client")

    // Dynamic import to avoid build-time DATABASE_URL requirement
    const { users } = await import("@/db/schema/users")
    const { and, eq, isNull } = await import("drizzle-orm")

    const [row] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        role: users.role,
        trustLevel: users.trustLevel,
      })
      .from(users)
      .where(and(eq(users.id, user.userId), eq(users.status, "active"), isNull(users.deletedAt)))
      .limit(1)

    if (!row) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: {
        id: row.id,
        displayName: row.displayName,
        role: row.role,
        trustLevel: row.trustLevel,
      },
    })
  } catch {
    // A deployed request must not turn a database outage into a successful
    // response containing a fabricated identity. Local development keeps the
    // explicit dev identities usable while the database is being configured.
    if (process.env.NEXT_PUBLIC_APP_ENV === "staging" || process.env.NEXT_PUBLIC_APP_ENV === "production") {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }
    return NextResponse.json({
      user: {
        id: user.userId,
        displayName:
          user.userId === "dev-admin-001"
            ? "司南开发者"
            : user.userId === "dev-user-001"
              ? "指路人#042"
              : undefined,
        role: user.role,
      },
    })
  }
}
