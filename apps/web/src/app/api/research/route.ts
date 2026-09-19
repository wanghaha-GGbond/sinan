import { NextResponse } from "next/server"

import {
  companyCards,
  getCompanySlug,
  mergeCompanyIndices,
  researchGeneratedAt,
  researchSummary,
} from "@/lib/research-report"
import { getPublishedResearchSnapshot } from "@/lib/server/published-research"

export async function GET() {
  const published = await getPublishedResearchSnapshot()
  const indices = mergeCompanyIndices(published?.companies)
  const cardsByName = new Map(companyCards.map((card) => [card.name, card]))
  const companies = [...indices]
    .sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1))
    .map((index) => ({
      slug: getCompanySlug(index.name),
      name: index.name,
      city: index.city,
      industry: index.industry,
      overallScore: index.overallScore,
      confidence: index.confidence,
      funTag: index.funTag,
      oneLine: cardsByName.get(index.name)?.oneLine ?? "",
    }))

  return NextResponse.json(
    { generatedAt: published?.generatedAt ?? researchGeneratedAt, summary: researchSummary, companies },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } }
  )
}
