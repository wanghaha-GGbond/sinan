import type { NextRequest } from "next/server"
import { z } from "zod"
import { ForumError } from "@/lib/forum"
import { voteForum } from "@/lib/server/forum-service"
import { forumRoute, forumJson, readForumJson, limitForumWrite, forumUser } from "@/lib/server/forum-http"
export async function PUT(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  return forumRoute(async () => {
    const user = await forumUser(request), { postId } = await params
    if (!z.uuid().safeParse(postId).success) throw new ForumError(400, "帖子编号无效")
    const { useful } = await readForumJson(request, z.object({ useful: z.boolean() }).strict())
    await limitForumWrite(request, user.userId, "vote", 120)
    return forumJson(await voteForum(user.userId, postId, useful))
  })
}
