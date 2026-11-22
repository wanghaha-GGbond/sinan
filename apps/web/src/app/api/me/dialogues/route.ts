import type { NextRequest } from "next/server"
import { dialoguePageInput, DialogueError } from "@/lib/dialogue"
import { getMyDialogues } from "@/lib/server/dialogue-service"
import { dialogueJson, dialogueRoute, dialogueUser } from "@/lib/server/dialogue-http"
export async function GET(request: NextRequest) {
  return dialogueRoute(async () => {
    const user = await dialogueUser(request), query = dialoguePageInput.pick({ cursor: true }).safeParse(Object.fromEntries(request.nextUrl.searchParams))
    if (!query.success) throw new DialogueError(400, "分页链接无效")
    return dialogueJson(await getMyDialogues(user.userId, query.data.cursor))
  })
}
