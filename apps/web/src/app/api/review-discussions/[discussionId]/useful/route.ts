import { NextRequest, NextResponse } from "next/server"
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import { z } from "zod"
import { reviewDiscussions } from "@/db/schema/review-discussions"
import { discussionUsefulVotes } from "@/db/schema/discussion-useful-votes"
import { reviews } from "@/db/schema/reviews"
import { users } from "@/db/schema/users"
import { requireAuthUser } from "@/lib/server/auth"
import { publicReviewCompanyCondition } from "@/lib/server/review-visibility"

const bodySchema = z.object({ useful: z.boolean() }).strict()
const headers = { "Cache-Control": "private, no-store" }

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ discussionId: string }> }
) {
  const { discussionId } = await params
  if (!z.uuid().safeParse(discussionId).success) return NextResponse.json({ error: "Discussion not found" }, { status: 404, headers })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "useful must be a boolean" }, { status: 400, headers })
  }
  const { useful } = parsed.data

  try {
    const { userId, sessionVersion } = await requireAuthUser(request)
    const { db } = await import("@/db/client")
    return await db.transaction(async (tx) => {
      // Hold a shared account lock so an in-flight vote cannot outlive
      // account deletion (or password reset) after the first auth check.
      const [active] = await tx.select({ id: users.id }).from(users)
        .where(and(eq(users.id, userId), eq(users.status, "active"), isNull(users.deletedAt),
          eq(users.sessionVersion, sessionVersion ?? 0))).for("share").limit(1)
      if (!active) return NextResponse.json({ error: "Authentication required" }, { status: 401, headers })
      // Serialize vote mutations AND recounts on the same discussion row.
      const [discussion] = await tx.select({ status: reviewDiscussions.status, visibleToPublic: reviewDiscussions.visibleToPublic })
        .from(reviewDiscussions)
        .innerJoin(reviews, and(eq(reviews.id, reviewDiscussions.reviewId), eq(reviews.companyId, reviewDiscussions.companyId)))
        .where(and(
          eq(reviewDiscussions.id, discussionId),
          isNull(reviewDiscussions.deletedAt),
          isNull(reviews.deletedAt),
          inArray(reviews.status, ["visible", "limited_visible"]),
          publicReviewCompanyCondition(),
        ))
        .for("update", { of: reviewDiscussions })
        .limit(1)

      if (!discussion) return NextResponse.json({ error: "Discussion not found" }, { status: 404, headers })
      if (!discussion.visibleToPublic || !["visible", "limited_visible"].includes(discussion.status)) {
        return NextResponse.json({ error: "Only public discussions can be voted useful" }, { status: 403, headers })
      }

      const now = new Date()
      const ownVote = and(eq(discussionUsefulVotes.discussionId, discussionId), eq(discussionUsefulVotes.userId, userId))
      if (useful) {
        // Prefer the active row, otherwise reuse a removed vote rather than
        // growing the ledger every time someone toggles the same button.
        const [existing] = await tx.select({ id: discussionUsefulVotes.id, deletedAt: discussionUsefulVotes.deletedAt, useful: discussionUsefulVotes.useful })
          .from(discussionUsefulVotes).where(ownVote)
          .orderBy(sql`${discussionUsefulVotes.deletedAt} desc nulls first`, desc(discussionUsefulVotes.id)).limit(1)
        if (!existing) {
          await tx.insert(discussionUsefulVotes).values({ discussionId, userId, useful: true })
        } else if (existing.deletedAt || !existing.useful) {
          await tx.update(discussionUsefulVotes).set({ useful: true, deletedAt: null, updatedAt: now })
            .where(eq(discussionUsefulVotes.id, existing.id))
        }
      } else {
        await tx.update(discussionUsefulVotes).set({ deletedAt: now, updatedAt: now })
          .where(and(ownVote, isNull(discussionUsefulVotes.deletedAt)))
      }

      const [{ total }] = await tx.select({ total: count() }).from(discussionUsefulVotes)
        .where(and(eq(discussionUsefulVotes.discussionId, discussionId), eq(discussionUsefulVotes.useful, true), isNull(discussionUsefulVotes.deletedAt)))
      const usefulCount = Number(total)
      await tx.update(reviewDiscussions).set({ usefulCount }).where(eq(reviewDiscussions.id, discussionId))

      return NextResponse.json({ usefulCount, isUsefulByCurrentUser: useful }, { headers })
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error(JSON.stringify({ event: "discussion_useful_failed", release: process.env.APP_RELEASE }))
    return NextResponse.json({ error: "讨论投票暂时不可用，请重试" }, { status: 503, headers })
  }
}
