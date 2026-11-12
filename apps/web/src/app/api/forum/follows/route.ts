import type { NextRequest } from "next/server"
import { z } from "zod"
import { requireAuthUser } from "@/lib/server/auth"
import { followForum, getForumFollows } from "@/lib/server/forum-service"
import { forumRoute, forumJson, readForumJson, limitForumWrite, forumUser } from "@/lib/server/forum-http"
export async function GET(request: NextRequest) {
  return forumRoute(async () => { const user = await requireAuthUser(request); return forumJson(await getForumFollows(user.userId)) })
}
export async function PUT(request: NextRequest) {
  return forumRoute(async () => {
    const user = await forumUser(request), { companyId, following } = await readForumJson(request, z.object({ companyId: z.uuid(), following: z.boolean() }).strict())
    await limitForumWrite(request, user.userId, "follow", 120)
    return forumJson(await followForum(user.userId, companyId, following))
  })
}
