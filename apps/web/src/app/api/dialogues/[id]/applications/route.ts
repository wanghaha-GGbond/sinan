import type { NextRequest } from "next/server"
import { dialogueApplicationInput } from "@/lib/dialogue"
import { applyForDialogue } from "@/lib/server/dialogue-service"
import { dialogueId, dialogueJson, dialogueRoute, dialogueUser, readDialogueJson, limitDialogueWrite } from "@/lib/server/dialogue-http"
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return dialogueRoute(async () => {
    const user = await dialogueUser(request), id = dialogueId((await params).id), data = await readDialogueJson(request, dialogueApplicationInput)
    await limitDialogueWrite(request, user.userId, "dialogue-apply", 20)
    return dialogueJson({ application: await applyForDialogue(user.userId, id, data) }, 201)
  })
}
