import type { NextRequest } from "next/server"
import { z } from "zod"
import { ForumError, forumReplyInput } from "@/lib/forum"
import { replyToForum } from "@/lib/server/forum-service"
import { forumRoute, forumJson, readForumJson, limitForumWrite, forumUser } from "@/lib/server/forum-http"
export async function POST(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  return forumRoute(async () => {
    const user = await forumUser(request), { postId } = await params
    if (!z.uuid().safeParse(postId).success) throw new ForumError(400, "帖子编号无效")
    const { content, requestId } = await readForumJson(request, forumReplyInput)
    await limitForumWrite(request, user.userId, "reply", 30)
    return forumJson({ reply: await replyToForum(user.userId, postId, content, requestId) }, 201)
  })
}
