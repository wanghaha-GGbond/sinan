import type { NextRequest } from "next/server"
import { z } from "zod"
import { ForumError } from "@/lib/forum"
import { getAuthUserFromRequest } from "@/lib/server/auth"
import { getForumDetail, deleteForumContent } from "@/lib/server/forum-service"
import { forumRoute, forumJson, readForumJson, limitForumWrite, forumUser } from "@/lib/server/forum-http"
type Context = { params: Promise<{ postId: string }> }
export async function GET(request: NextRequest, { params }: Context) {
  return forumRoute(async () => {
    const { postId } = await params
    if (!z.uuid().safeParse(postId).success) throw new ForumError(400, "帖子编号无效")
    const query = z.object({ cursor: z.string().max(1024).optional() }).strict().safeParse(Object.fromEntries(request.nextUrl.searchParams))
    if (!query.success) throw new ForumError(400, "分页参数无效")
    const viewer = await getAuthUserFromRequest(request)
    return forumJson(await getForumDetail(postId, viewer?.userId, query.data.cursor))
  })
}
export async function DELETE(request: NextRequest, { params }: Context) {
  return forumRoute(async () => {
    const user = await forumUser(request), { postId } = await params
    if (!z.uuid().safeParse(postId).success) throw new ForumError(400, "帖子编号无效")
    const { replyId } = await readForumJson(request, z.object({ replyId: z.uuid().optional() }).strict())
    await limitForumWrite(request, user.userId, "delete", 60)
    return forumJson(await deleteForumContent(user.userId, postId, replyId))
  })
}
