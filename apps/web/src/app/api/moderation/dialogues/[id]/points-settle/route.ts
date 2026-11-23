import type { NextRequest } from "next/server"
import { settlePointAuction } from "@/lib/server/points-service"
import { pointsRoute } from "@/lib/server/points-http"
import { dialogueId, dialogueJson, dialogueUser, limitDialogueWrite } from "@/lib/server/dialogue-http"
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return pointsRoute(async () => {
    const user = await dialogueUser(request, true), id = dialogueId((await params).id)
    await limitDialogueWrite(request, user.userId, "points-settle", 30)
    return dialogueJson(await settlePointAuction(user.userId, id))
  })
}
