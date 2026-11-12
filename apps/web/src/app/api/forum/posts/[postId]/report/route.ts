import type { NextRequest } from "next/server"
import { z } from "zod"
import { ForumError } from "@/lib/forum"
import { reportForum } from "@/lib/server/forum-service"
import { forumRoute, forumJson, readForumJson, limitForumWrite, forumUser } from "@/lib/server/forum-http"
export async function POST(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  return forumRoute(async () => {
    const user = await forumUser(request), { postId } = await params
    if (!z.uuid().safeParse(postId).success) throw new ForumError(400, "帖子编号无效")
    const { reason, replyId } = await readForumJson(request, z.object({ reason: z.enum(["privacy", "attack", "spam", "other"]), replyId: z.uuid().optional() }).strict())
    await limitForumWrite(request, user.userId, "report", 20)
    return forumJson(await reportForum(user.userId, postId, reason, replyId), 201)
  })
}
