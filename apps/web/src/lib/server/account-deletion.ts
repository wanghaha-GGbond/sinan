export const ACCOUNT_DELETION_CONFIRMATION = "DELETE"

/**
 * Remove direct identifiers immediately while retaining the opaque user id
 * needed to keep moderation/audit records and published content consistent.
 */
export function buildDeletedUserValues(userId: string, deletedAt = new Date()) {
  return {
    email: null,
    phone: null,
    passwordHash: null,
    displayName: `已注销用户-${userId.slice(0, 8)}`,
    avatarUrl: null,
    status: "deleted" as const,
    jobBand: null,
    yearsOfExperience: null,
    highlightMoment: null,
    declinedOffer: null,
    profileFieldsStatus: null,
    deletedAt,
    updatedAt: deletedAt,
  }
}
