import type { NextRequest } from "next/server"
import { DialogueError, dialogueDraftInput, dialoguePageInput } from "@/lib/dialogue"
import { createDialogue, getDialogueManagement } from "@/lib/server/dialogue-service"
import { dialogueJson, dialogueRoute, dialogueUser, readDialogueJson, limitDialogueWrite, dialogueModerator } from "@/lib/server/dialogue-http"
export async function GET(request: NextRequest) {
  return dialogueRoute(async () => {
    const user = await dialogueModerator(request), query = dialoguePageInput.pick({ cursor: true }).safeParse(Object.fromEntries(request.nextUrl.searchParams))
    if (!query.success) throw new DialogueError(400, "分页链接无效")
    return dialogueJson(await getDialogueManagement(user.userId, query.data.cursor))
  })
}
export async function POST(request: NextRequest) {
  return dialogueRoute(async () => {
    const user = await dialogueUser(request, true), data = await readDialogueJson(request, dialogueDraftInput)
    await limitDialogueWrite(request, user.userId, "dialogue-create", 20)
    return dialogueJson({ session: await createDialogue(user.userId, data) }, 201)
  })
}
