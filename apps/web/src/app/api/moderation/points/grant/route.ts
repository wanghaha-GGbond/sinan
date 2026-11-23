import type { NextRequest } from "next/server"
import { pointGrantInput } from "@/lib/points"
import { grantActivityPoints } from "@/lib/server/points-service"
import { pointsRoute } from "@/lib/server/points-http"
import { dialogueJson, dialogueUser, readDialogueJson, limitDialogueWrite } from "@/lib/server/dialogue-http"
export async function POST(request: NextRequest) {
  return pointsRoute(async () => {
    const user = await dialogueUser(request, true), data = await readDialogueJson(request, pointGrantInput)
    await limitDialogueWrite(request, user.userId, "points-activity", 30)
    return dialogueJson(await grantActivityPoints(user.userId, data))
  })
}
