import type { NextRequest } from "next/server"
import { dialogueActionInput } from "@/lib/dialogue"
import { manageDialogue } from "@/lib/server/dialogue-service"
import { dialogueId, dialogueJson, dialogueRoute, dialogueUser, readDialogueJson, limitDialogueWrite } from "@/lib/server/dialogue-http"
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return dialogueRoute(async () => {
    const user = await dialogueUser(request, true), id = dialogueId((await params).id), data = await readDialogueJson(request, dialogueActionInput)
    await limitDialogueWrite(request, user.userId, "dialogue-manage", 100)
    return dialogueJson(await manageDialogue(user.userId, id, data))
  })
}
