import { NextRequest, NextResponse } from "next/server"
import { getAuthUserFromRequest } from "@/lib/server/auth"
import { getMyReviewPage, parseMyReviewCursor } from "@/lib/server/my-reviews"

const headers = { "Cache-Control": "private, no-store" }

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request, { reportUnavailable: true })
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401, headers })
    const raw = request.nextUrl.searchParams.get("cursor")
    const cursor = raw === null ? undefined : parseMyReviewCursor(raw)
    if (raw !== null && !cursor) return NextResponse.json({ error: "分页链接无效，请重新打开个人页" }, { status: 400, headers })
    const { reviews, nextCursor } = await getMyReviewPage(user.userId, cursor)
    return NextResponse.json({ reviews, nextCursor }, { headers })
  } catch {
    return NextResponse.json({ error: "评价暂时无法加载，请重试" }, { status: 503, headers })
  }
}
