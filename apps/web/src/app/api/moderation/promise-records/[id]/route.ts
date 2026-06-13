import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { moderationEvents } from "@/db/schema/moderation-events"
import { promiseRecords } from "@/db/schema/promise-records"
import { requireModerator } from "@/lib/server/auth"

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(500).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let moderator
  try {
    moderator = await requireModerator()
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }
  const { id } = await params
  const parsed = actionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || (parsed.data.action === "reject" && !parsed.data.reason)) {
    return NextResponse.json({ error: "拒绝时必须填写原因" }, { status: 400 })
  }

  try {
    const { db } = await import("@/db/client")
    const targetStatus = parsed.data.action === "approve" ? "visible" : "rejected"
    const updated = await db.transaction(async (tx) => {
      const [record] = await tx
        .update(promiseRecords)
        .set({
          status: targetStatus,
          moderationReason: parsed.data.reason ?? null,
          reviewedByUserId: moderator.userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(promiseRecords.id, id),
            eq(promiseRecords.status, "pending_review")
          )
        )
        .returning({ id: promiseRecords.id })
      if (!record) return false
      await tx.insert(moderationEvents).values({
        entityType: "promise_record",
        entityId: id,
        actorUserId: moderator.userId,
        actorRole: "moderator",
        fromStatus: "pending_review",
        toStatus: targetStatus,
        reason: parsed.data.reason ?? null,
      })
      return true
    })
    if (!updated) return NextResponse.json({ error: "记录状态已变化" }, { status: 409 })
    return NextResponse.json({ status: targetStatus })
  } catch (error) {
    console.error("PATCH promise moderation failed:", error)
    return NextResponse.json({ error: "审核操作失败" }, { status: 503 })
  }
}
