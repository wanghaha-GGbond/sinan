import { NextResponse } from "next/server"

import {
  companyCards,
  companyIndices,
  getCompanySlug,
  researchGeneratedAt,
  researchSummary,
} from "@/lib/research-report"

export function GET() {
  const cardsByName = new Map(companyCards.map((card) => [card.name, card]))
  const companies = [...companyIndices]
    .sort((a, b) => b.overallScore - a.overallScore)
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
    { generatedAt: researchGeneratedAt, summary: researchSummary, companies },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } }
  )
}
