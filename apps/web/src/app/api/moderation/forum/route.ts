import type { NextRequest } from "next/server"
import { z } from "zod"
import { requireModerator } from "@/lib/server/auth"
import { getForumQueue, moderateForum } from "@/lib/server/forum-service"
import { forumRoute, forumJson, readForumJson, limitForumWrite, forumUser } from "@/lib/server/forum-http"
export async function GET(request: NextRequest) {
  return forumRoute(async () => { await requireModerator(request); return forumJson(await getForumQueue()) })
}
export async function PATCH(request: NextRequest) {
  return forumRoute(async () => {
    const moderator = await forumUser(request, true)
    const data = await readForumJson(request, z.object({ kind: z.enum(["post", "reply"]), id: z.uuid(), postId: z.uuid(),
      status: z.enum(["visible", "hidden", "rejected"]), expectedStatus: z.enum(["pending_review", "visible", "hidden", "rejected"]), reason: z.string().trim().min(2).max(160),
    }).strict())
    await limitForumWrite(request, moderator.userId, "moderate", 300)
    return forumJson(await moderateForum(moderator.userId, data))
  })
}
