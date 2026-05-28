import type { InferSelectModel } from "drizzle-orm"
import type { companies } from "@/db/schema/companies"

/**
 * PublicCompanyView — the whitelisted set of fields safe to return
 * in public API responses. All sensitive/internal fields are excluded.
 *
 * NEVER returned: submittedByUserId, submittedByAnonymousProfileId,
 *   rejectionReason, deletedAt
 */
export type PublicCompanyView = {
  id: string
  name: string
  registeredName: string | null
  shortName: string | null
  englishName: string | null
  aliases: string[] | null
  city: string
  industry: string
  size: string | null
  financingStage: string | null
  website: string | null
  logoUrl: string | null
  description: string | null
  reviewStatus: "pending_review" | "reviewable" | "rejected"
  claimedStatus: "unclaimed" | "claimed"
  source: "platform_seed" | "user_added" | "platform_verified" | "import"
  businessStatus: string | null
  foundedDate: string | null
  unifiedSocialCreditCode: string | null
  registeredAddress: string | null
  legalRepresentative: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Strip internal/sensitive fields from a company row before returning
 * to public API consumers. This is a whitelist filter — even if a query
 * accidentally selects sensitive columns, they will not be serialized.
 */
export function toPublicCompanyView(
  row: InferSelectModel<typeof companies>
): PublicCompanyView {
  return {
    id: row.id,
    name: row.name,
    registeredName: row.registeredName,
    shortName: row.shortName,
    englishName: row.englishName,
    aliases: row.aliases,
    city: row.city,
    industry: row.industry,
    size: row.size,
    financingStage: row.financingStage,
    website: row.website,
    logoUrl: row.logoUrl,
    description: row.description,
    reviewStatus: row.reviewStatus,
    claimedStatus: row.claimedStatus,
    source: row.source,
    businessStatus: row.businessStatus,
    foundedDate: row.foundedDate,
    unifiedSocialCreditCode: row.unifiedSocialCreditCode,
    registeredAddress: row.registeredAddress,
    legalRepresentative: row.legalRepresentative,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  }
}
