import { and, asc, count, eq, inArray, isNull, or, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

import { users } from "@/db/schema/users"
import { forumPosts, forumReplies, forumVotes, forumFollows, forumReports } from "@/db/schema/forum"
import { pulseCheckins } from "@/db/schema/pulse-checkins"
import { dialogueApplications, dialogueSessions, dialogueAuditEvents } from "@/db/schema/dialogues"
import { passwordResetTokens } from "@/db/schema/password-reset-tokens"
import { anonymousProfiles } from "@/db/schema/anonymous-profiles"
import { auctionBids, auctions } from "@/db/schema/auctions"
import { circleMembers } from "@/db/schema/circles"
import { companyAppeals } from "@/db/schema/company-appeals"
import { companyCorrections } from "@/db/schema/company-corrections"
import { companyVerifications } from "@/db/schema/company-verifications"
import { discussionUsefulVotes } from "@/db/schema/discussion-useful-votes"
import { dmRequests, dmThreads } from "@/db/schema/dm"
import { emailVerificationCodes } from "@/db/schema/email-verification-codes"
import { gratitude, highlights, skillEndorsements, skills } from "@/db/schema/p1-features"
import { promiseRecords } from "@/db/schema/promise-records"
import { reviewDiscussions } from "@/db/schema/review-discussions"
import { reviewReports } from "@/db/schema/review-reports"
import { reviewAuthorBlocks } from "@/db/schema/review-author-blocks"
import { reviewUsefulVotes } from "@/db/schema/review-useful-votes"
import { reviews } from "@/db/schema/reviews"
import {
  ACCOUNT_DELETION_CONFIRMATION,
  buildDeletedUserValues,
} from "@/lib/server/account-deletion"
import { clearAuthCookie, requireAuthUser } from "@/lib/server/auth"
import { lockPointsEconomy, deleteUserPoints } from "@/lib/server/points-service"

export async function DELETE(request: NextRequest) {
  let authUser
  try {
    authUser = await requireAuthUser(request)
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }

  let body: { confirmation?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (body.confirmation !== ACCOUNT_DELETION_CONFIRMATION) {
    return NextResponse.json(
      { error: "Account deletion confirmation does not match" },
      { status: 400 }
    )
  }

  try {
    const { db } = await import("@/db/client")
    const deletedAt = new Date()
    const deletedUser = await db.transaction(async (tx) => {
      await lockPointsEconomy(tx)
      await tx.select({ id: users.id }).from(users).where(eq(users.id, authUser.userId)).for("update")
      await deleteUserPoints(tx, authUser.userId)
      await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, authUser.userId))
      await tx.delete(pulseCheckins).where(eq(pulseCheckins.userId, authUser.userId))
      await tx.delete(dialogueApplications).where(eq(dialogueApplications.userId, authUser.userId))
      await tx.update(dialogueSessions).set({ createdBy: null }).where(eq(dialogueSessions.createdBy, authUser.userId))
      await tx.update(dialogueAuditEvents).set({ actorUserId: null }).where(eq(dialogueAuditEvents.actorUserId, authUser.userId))
      await tx.delete(forumFollows).where(eq(forumFollows.userId, authUser.userId))
      await tx.delete(forumVotes).where(eq(forumVotes.userId, authUser.userId))
      await tx.update(forumReports).set({ reporterUserId: null }).where(eq(forumReports.reporterUserId, authUser.userId))
      // Purge private submissions, preserve approved content without attribution.
      await tx.delete(forumPosts).where(and(eq(forumPosts.authorUserId, authUser.userId), inArray(forumPosts.status, ["pending_review", "hidden", "rejected", "deleted"])))
      await tx.delete(forumReplies).where(and(eq(forumReplies.authorUserId, authUser.userId), inArray(forumReplies.status, ["pending_review", "hidden", "rejected", "deleted"])))
      await tx.update(forumPosts).set({ authorUserId: null }).where(eq(forumPosts.authorUserId, authUser.userId))
      await tx.update(forumReplies).set({ authorUserId: null }).where(eq(forumReplies.authorUserId, authUser.userId))
      const profileRows = await tx
        .select({ id: anonymousProfiles.id })
        .from(anonymousProfiles)
        .where(eq(anonymousProfiles.userId, authUser.userId))
      const profileIds = profileRows.map((row) => row.id)

      // Vote writers lock the account before the discussion. Take discussion
      // locks in stable order before deleting votes or anonymizing authors.
      const ownVote = or(eq(discussionUsefulVotes.userId, authUser.userId),
        profileIds.length ? inArray(discussionUsefulVotes.anonymousProfileId, profileIds) : undefined)
      const affected = await tx.select({ id: reviewDiscussions.id }).from(reviewDiscussions)
        .where(inArray(reviewDiscussions.id, tx.select({ id: discussionUsefulVotes.discussionId })
          .from(discussionUsefulVotes).where(and(ownVote, isNull(discussionUsefulVotes.deletedAt)))))
        .orderBy(asc(reviewDiscussions.id)).for("update")
      await tx.delete(discussionUsefulVotes).where(ownVote)
      if (affected.length) {
        await tx.update(reviewDiscussions).set({
          usefulCount: sql`(select count(*) from ${discussionUsefulVotes}
            where ${discussionUsefulVotes.discussionId} = ${reviewDiscussions.id}
              and ${discussionUsefulVotes.useful} and ${discussionUsefulVotes.deletedAt} is null)`,
        }).where(inArray(reviewDiscussions.id, affected.map(row => row.id)))
      }

      if (profileIds.length > 0) {
        await tx.update(reviews).set({ anonymousProfileId: null }).where(inArray(reviews.anonymousProfileId, profileIds))
        await tx.update(reviewDiscussions).set({ anonymousProfileId: null }).where(inArray(reviewDiscussions.anonymousProfileId, profileIds))
        await tx.update(reviewReports).set({ reporterAnonymousProfileId: null }).where(inArray(reviewReports.reporterAnonymousProfileId, profileIds))
        await tx.update(promiseRecords).set({ anonymousProfileId: null }).where(inArray(promiseRecords.anonymousProfileId, profileIds))
        await tx.update(companyCorrections).set({ submitterAnonymousProfileId: null }).where(inArray(companyCorrections.submitterAnonymousProfileId, profileIds))
        await tx.update(companyAppeals).set({ submitterAnonymousProfileId: null }).where(inArray(companyAppeals.submitterAnonymousProfileId, profileIds))
        await tx.delete(anonymousProfiles).where(inArray(anonymousProfiles.id, profileIds))
      }

      // Preserve moderated public content, but sever every private account or
      // fingerprint link used to attribute it internally.
      await tx.update(reviews).set({ authorUserId: null, authorFingerprintHash: null }).where(eq(reviews.authorUserId, authUser.userId))
      await tx.update(reviewDiscussions).set({ authorUserId: null, authorFingerprintHash: null }).where(eq(reviewDiscussions.authorUserId, authUser.userId))
      await tx.update(reviewReports).set({ reporterUserId: null, reporterFingerprintHash: null }).where(eq(reviewReports.reporterUserId, authUser.userId))
      const reviewVoteRows = await tx
        .select({ reviewId: reviewUsefulVotes.reviewId })
        .from(reviewUsefulVotes)
        .where(eq(reviewUsefulVotes.userId, authUser.userId))
      await tx.delete(reviewUsefulVotes).where(eq(reviewUsefulVotes.userId, authUser.userId))
      await tx.delete(reviewAuthorBlocks).where(eq(reviewAuthorBlocks.blockerUserId, authUser.userId))
      for (const reviewId of new Set(reviewVoteRows.map((row) => row.reviewId))) {
        const [{ activeVotes }] = await tx
          .select({ activeVotes: count() })
          .from(reviewUsefulVotes)
          .where(
            and(
              eq(reviewUsefulVotes.reviewId, reviewId),
              eq(reviewUsefulVotes.useful, true)
            )
          )
        const [review] = await tx
          .select({ baseline: reviews.usefulVoteBaseline })
          .from(reviews)
          .where(eq(reviews.id, reviewId))
          .limit(1)
        if (review) {
          await tx
            .update(reviews)
            .set({
              usefulCount: review.baseline + Number(activeVotes ?? 0),
              updatedAt: deletedAt,
            })
            .where(eq(reviews.id, reviewId))
        }
      }

      await tx.update(companyCorrections).set({ submitterUserId: null, submitterFingerprintHash: null, contactEmail: null }).where(eq(companyCorrections.submitterUserId, authUser.userId))
      await tx.update(companyAppeals).set({ submitterUserId: null, submitterFingerprintHash: null, contactEmail: null }).where(eq(companyAppeals.submitterUserId, authUser.userId))

      // Verification records have moderation value, but names, work email,
      // title, notes and one-time codes do not need to survive deletion.
      await tx.delete(emailVerificationCodes).where(
        inArray(
          emailVerificationCodes.verificationId,
          tx.select({ id: companyVerifications.id })
            .from(companyVerifications)
            .where(eq(companyVerifications.applicantUserId, authUser.userId)),
        ),
      )
      await tx.update(companyVerifications).set({
        applicantName: "已注销用户",
        workEmail: `deleted-${authUser.userId}@invalid.local`,
        jobTitle: "已删除",
        note: null,
        updatedAt: deletedAt,
      }).where(eq(companyVerifications.applicantUserId, authUser.userId))

      // P2/private surfaces are not retained: delete direct messages,
      // memberships and personal profile submissions rather than anonymizing
      // their free-form content.
      await tx.delete(dmRequests).where(or(eq(dmRequests.fromUserId, authUser.userId), eq(dmRequests.toUserId, authUser.userId)))
      await tx.delete(dmThreads).where(or(eq(dmThreads.participantAId, authUser.userId), eq(dmThreads.participantBId, authUser.userId)))
      await tx.delete(auctionBids).where(eq(auctionBids.bidderUserId, authUser.userId))
      await tx.delete(auctions).where(eq(auctions.hostUserId, authUser.userId))
      await tx.delete(circleMembers).where(or(eq(circleMembers.userId, authUser.userId), eq(circleMembers.endorsedByUserId, authUser.userId)))
      await tx.delete(gratitude).where(or(eq(gratitude.fromUserId, authUser.userId), eq(gratitude.toUserId, authUser.userId)))
      await tx.delete(highlights).where(eq(highlights.userId, authUser.userId))
      await tx.delete(skillEndorsements).where(eq(skillEndorsements.endorserUserId, authUser.userId))
      await tx.delete(skills).where(eq(skills.userId, authUser.userId))

      const [row] = await tx
        .update(users)
        .set(buildDeletedUserValues(authUser.userId, deletedAt))
        .where(eq(users.id, authUser.userId))
        .returning({ id: users.id })
      return row
    })

    const response = deletedUser
      ? NextResponse.json({ success: true })
      : NextResponse.json({ error: "Account not found" }, { status: 404 })
    await clearAuthCookie(response)
    return response
  } catch (error) {
    console.error("DELETE /api/me/account failed:", error)
    return NextResponse.json(
      { error: "Account deletion is temporarily unavailable" },
      { status: 503 }
    )
  }
}
