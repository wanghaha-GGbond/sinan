/**
 * GET  /api/moderation/highlights — moderator 队列(pending)
 * PATCH /api/moderation/highlights — approve / reject
 */
import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"

import { highlights } from "@/db/schema/p1-features"
import { isValidHighlightModerationDecision } from "@/lib/server/p1-m4-services"

export const dynamic = "force-dynamic"

export async function GET() {
  const { requireModerator } = await import("@/lib/server/auth")
  try {
    await requireModerator()
  } catch (resp) {
    if (resp instanceof Response) return resp
    throw resp
  }

  try {
    const { db } = await import("@/db/client")
    const rows = await db
      .select()
      .from(highlights)
      .where(eq(highlights.status, "pending"))
      .orderBy(desc(highlights.createdAt))
      .limit(50)
    return NextResponse.json({ items: rows })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const { requireModerator } = await import("@/lib/server/auth")
  let moderator
  try {
    moderator = await requireModerator()
  } catch (resp) {
    if (resp instanceof Response) return resp
    throw resp
  }

  let body: { id?: unknown; decision?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 })
  }
  if (!isValidHighlightModerationDecision(body.decision)) {
    return NextResponse.json({ error: "invalid decision" }, { status: 400 })
  }

  try {
    const { db } = await import("@/db/client")
    const [updated] = await db
      .update(highlights)
      .set({
        status: body.decision,
        reviewedByUserId: moderator.userId,
        reviewedAt: new Date(),
      })
      .where(and(eq(highlights.id, body.id), eq(highlights.status, "pending")))
      .returning()

    if (!updated) {
      return NextResponse.json(
        { error: "highlight not found or not pending" },
        { status: 404 }
      )
    }
    return NextResponse.json({ highlight: updated })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}