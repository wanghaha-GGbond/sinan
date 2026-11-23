import type { NextRequest } from "next/server"
import { DialogueError, dialoguePageInput } from "@/lib/dialogue"
import { getDialogueApplications } from "@/lib/server/dialogue-service"
import { dialogueId, dialogueJson, dialogueRoute, dialogueModerator } from "@/lib/server/dialogue-http"
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return dialogueRoute(async () => {
    const user = await dialogueModerator(request), id = dialogueId((await params).id), query = dialoguePageInput.pick({ cursor: true }).safeParse(Object.fromEntries(request.nextUrl.searchParams))
    if (!query.success) throw new DialogueError(400, "分页链接无效")
    return dialogueJson(await getDialogueApplications(user.userId, id, query.data.cursor))
  })
}
