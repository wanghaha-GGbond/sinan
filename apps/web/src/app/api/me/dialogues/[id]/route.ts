import type { NextRequest } from "next/server"
import { withdrawDialogue } from "@/lib/server/dialogue-service"
import { dialogueId, dialogueJson, dialogueRoute, dialogueUser, limitDialogueWrite } from "@/lib/server/dialogue-http"
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return dialogueRoute(async () => {
    const user = await dialogueUser(request), id = dialogueId((await params).id)
    await limitDialogueWrite(request, user.userId, "dialogue-withdraw", 30)
    return dialogueJson(await withdrawDialogue(user.userId, id))
  })
}
