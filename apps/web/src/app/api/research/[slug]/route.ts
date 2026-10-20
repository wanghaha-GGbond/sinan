import { NextResponse } from "next/server"

import {
  componentLabels,
  funIndexLabels,
  getResearchCompany,
} from "@/lib/research-report"
import { getPublishedResearchCompany } from "@/lib/server/published-research"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const result = getResearchCompany(slug)
  if (!result) return NextResponse.json({ error: "Research report not found" }, { status: 404 })
  const publishedIndex = await getPublishedResearchCompany(result.card.name)

  return NextResponse.json(
    { ...result, index: publishedIndex ?? result.index, labels: { components: componentLabels, funIndices: funIndexLabels } },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } }
  )
}
