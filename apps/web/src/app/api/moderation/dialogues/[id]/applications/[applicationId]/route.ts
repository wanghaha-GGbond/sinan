import type { NextRequest } from "next/server"
import { dialogueDecisionInput } from "@/lib/dialogue"
import { decideDialogue } from "@/lib/server/dialogue-service"
import { dialogueId, dialogueJson, dialogueRoute, dialogueUser, readDialogueJson, limitDialogueWrite } from "@/lib/server/dialogue-http"
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; applicationId: string }> }) {
  return dialogueRoute(async () => {
    const user = await dialogueUser(request, true), ids = await params, id = dialogueId(ids.id), applicationId = dialogueId(ids.applicationId)
    const data = await readDialogueJson(request, dialogueDecisionInput)
    await limitDialogueWrite(request, user.userId, "dialogue-decide", 100)
    return dialogueJson(await decideDialogue(user.userId, id, applicationId, data))
  })
}
