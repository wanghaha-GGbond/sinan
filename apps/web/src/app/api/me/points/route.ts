import type { NextRequest } from "next/server"
import { getPointsWallet } from "@/lib/server/points-service"
import { pointsRoute } from "@/lib/server/points-http"
import { dialogueJson, dialogueUser } from "@/lib/server/dialogue-http"
export async function GET(request: NextRequest) {
  return pointsRoute(async () => dialogueJson(await getPointsWallet((await dialogueUser(request)).userId)))
}
