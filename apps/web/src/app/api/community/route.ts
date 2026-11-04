import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAuthUserFromRequest } from "@/lib/server/auth"
import { getCommunityFeed } from "@/lib/server/community-feed"

const filtersSchema = z.object({
  companyId: z.string().uuid().optional(),
  industry: z.string().trim().min(1).max(80).optional(),
  city: z.string().trim().min(1).max(80).optional(),
  type: z.enum(["question", "supplement"]).optional(),
  sort: z.enum(["useful", "latest", "company"]).optional(),
}).strict()
const headers = { "Cache-Control": "private, no-store" }

export async function GET(request: NextRequest) {
  const parsed = filtersSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: "筛选条件无效" }, { status: 400, headers })
  try {
    const user = await getAuthUserFromRequest(request)
    return NextResponse.json({ discussions: await getCommunityFeed(parsed.data, user?.userId), limit: 50 }, { headers })
  } catch {
    console.error(JSON.stringify({ event: "community_feed_failed", release: process.env.APP_RELEASE }))
    return NextResponse.json({ error: "讨论暂时无法加载，请重试" }, { status: 503, headers })
  }
}
