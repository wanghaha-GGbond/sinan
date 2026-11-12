import type { NextRequest } from "next/server"
import { forumFiltersSchema, forumPostInput, ForumError } from "@/lib/forum"
import { getAuthUserFromRequest } from "@/lib/server/auth"
import { getForumFeed, createForumPost } from "@/lib/server/forum-service"
import { forumRoute, forumJson, readForumJson, limitForumWrite, forumUser } from "@/lib/server/forum-http"
export async function GET(request: NextRequest) {
  return forumRoute(async () => {
    const filters = forumFiltersSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
    if (!filters.success) throw new ForumError(400, "筛选条件无效")
    const viewer = await getAuthUserFromRequest(request)
    return forumJson(await getForumFeed(filters.data, viewer?.userId))
  })
}
export async function POST(request: NextRequest) {
  return forumRoute(async () => {
    const user = await forumUser(request), data = await readForumJson(request, forumPostInput)
    await limitForumWrite(request, user.userId, "post", 5, 86400)
    return forumJson({ post: await createForumPost(user.userId, data) }, 201)
  })
}
