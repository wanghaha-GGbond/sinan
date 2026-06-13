import { NextResponse } from "next/server"
import { z } from "zod"

import { requireModerator } from "@/lib/server/auth"

const actionSchema = z.object({
  field: z.enum(["highlightMoment", "declinedOffer"]),
  action: z.enum(["approve", "reject"]),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireModerator()
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }

  const { userId } = await params
  const parsed = actionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "审核参数错误" }, { status: 400 })
  }

  try {
    const { db } = await import("@/db/client")
    const { users } = await import("@/db/schema/users")
    const { eq } = await import("drizzle-orm")
    const [user] = await db
      .select({
        profileFieldsStatus: users.profileFieldsStatus,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const { field, action } = parsed.data
    const statuses: Record<string, "pending" | "approved" | "rejected"> = {
      ...(user.profileFieldsStatus ?? {}),
      [field]: action === "approve" ? "approved" : "rejected",
    }
    await db
      .update(users)
      .set({
        profileFieldsStatus: statuses,
        ...(action === "reject" ? { [field]: null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))

    return NextResponse.json({ updated: true })
  } catch (error) {
    console.error("PATCH /api/moderation/profile-fields failed:", error)
    return NextResponse.json({ error: "审核操作失败" }, { status: 503 })
  }
}
