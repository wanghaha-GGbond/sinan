import type { NextRequest } from "next/server"
import { pointBidInput } from "@/lib/points"
import { getMyPointBid, placePointBid } from "@/lib/server/points-service"
import { pointsRoute } from "@/lib/server/points-http"
import { dialogueId, dialogueJson, dialogueUser, readDialogueJson, limitDialogueWrite } from "@/lib/server/dialogue-http"
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return pointsRoute(async () => {
    const user = await dialogueUser(request), id = dialogueId((await params).id)
    return dialogueJson({ application: await getMyPointBid(user.userId, id) })
  })
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return pointsRoute(async () => {
    const user = await dialogueUser(request), id = dialogueId((await params).id), data = await readDialogueJson(request, pointBidInput)
    await limitDialogueWrite(request, user.userId, "points-bid", 60)
    return dialogueJson({ application: await placePointBid(user.userId, id, data) }, 201)
  })
}
