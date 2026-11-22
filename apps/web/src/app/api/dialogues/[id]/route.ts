import type { NextRequest } from "next/server"
import { getDialogue } from "@/lib/server/dialogue-service"
import { dialogueId, dialogueJson, dialogueRoute } from "@/lib/server/dialogue-http"
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return dialogueRoute(async () => dialogueJson({ session: await getDialogue(dialogueId((await params).id)) }))
}
