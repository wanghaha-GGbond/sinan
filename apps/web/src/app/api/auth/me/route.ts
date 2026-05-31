import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/server/auth"

export async function GET() {
  const user = await getAuthUser()

  if (!user) {
    return NextResponse.json({ user: null })
  }

  try {
    const { db } = await import("@/db/client")

    // Dynamic import to avoid build-time DATABASE_URL requirement
    const { users } = await import("@/db/schema/users")
    const { eq } = await import("drizzle-orm")

    const [row] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        role: users.role,
        trustLevel: users.trustLevel,
      })
      .from(users)
      .where(eq(users.id, user.userId))
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
    // If DB is not available, still return the basic auth info
    return NextResponse.json({
      user: {
        id: user.userId,
        displayName: user.userId === "dev-user-001" ? "指路人#042" : undefined,
        role: user.role,
      },
    })
  }
}
