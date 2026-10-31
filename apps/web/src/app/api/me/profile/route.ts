import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireAuthUser } from "@/lib/server/auth"

const profileSchema = z.object({
  displayName: z.string().trim().min(2, "昵称至少 2 个字符").max(40, "昵称最多 40 个字符").optional(),
  jobBand: z.string().trim().max(40).nullable(),
  yearsOfExperience: z.number().int().min(0).max(60).nullable(),
  highlightMoment: z.string().trim().max(120).nullable(),
  declinedOffer: z.string().trim().max(120).nullable(),
})

export async function PATCH(request: NextRequest) {
  let authUser
  try {
    authUser = await requireAuthUser(request)
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }

  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "资料格式错误" },
      { status: 400 }
    )
  }

  try {
    const { db } = await import("@/db/client")
    const { users } = await import("@/db/schema/users")
    const { eq } = await import("drizzle-orm")
    const data = parsed.data

    const [current] = await db
      .select({
        highlightMoment: users.highlightMoment,
        declinedOffer: users.declinedOffer,
        profileFieldsStatus: users.profileFieldsStatus,
      })
      .from(users)
      .where(eq(users.id, authUser.userId))
      .limit(1)
    if (!current) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const statuses = { ...(current.profileFieldsStatus ?? {}) }
    if (data.highlightMoment !== current.highlightMoment) {
      statuses.highlightMoment = data.highlightMoment ? "pending" : "approved"
    }
    if (data.declinedOffer !== current.declinedOffer) {
      statuses.declinedOffer = data.declinedOffer ? "pending" : "approved"
    }

    await db
      .update(users)
      .set({
        ...(data.displayName === undefined ? {} : { displayName: data.displayName }),
        jobBand: data.jobBand || null,
        yearsOfExperience: data.yearsOfExperience,
        highlightMoment: data.highlightMoment || null,
        declinedOffer: data.declinedOffer || null,
        profileFieldsStatus: statuses,
        updatedAt: new Date(),
      })
      .where(eq(users.id, authUser.userId))

    return NextResponse.json({
      updated: true,
      pendingReview: Object.entries(statuses)
        .filter(([, status]) => status === "pending")
        .map(([field]) => field),
    })
  } catch {
    console.error(JSON.stringify({ event: "profile_update_failed", release: process.env.APP_RELEASE }))
    return NextResponse.json({ error: "资料暂时无法保存" }, { status: 503 })
  }
}
