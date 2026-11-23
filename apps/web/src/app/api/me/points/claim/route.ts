import type { NextRequest } from "next/server"
import { pointTaskInput } from "@/lib/points"
import { claimPointTask } from "@/lib/server/points-service"
import { pointsRoute } from "@/lib/server/points-http"
import { dialogueJson, dialogueUser, readDialogueJson, limitDialogueWrite } from "@/lib/server/dialogue-http"
export async function POST(request: NextRequest) {
  return pointsRoute(async () => {
    const user = await dialogueUser(request), data = await readDialogueJson(request, pointTaskInput)
    await limitDialogueWrite(request, user.userId, "points-claim", 30)
    return dialogueJson(await claimPointTask(user.userId, data.task))
  })
}
