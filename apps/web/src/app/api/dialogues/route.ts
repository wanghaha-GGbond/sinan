import type { NextRequest } from "next/server"
import { dialoguePageInput, DialogueError } from "@/lib/dialogue"
import { getDialogues } from "@/lib/server/dialogue-service"
import { dialogueJson, dialogueRoute } from "@/lib/server/dialogue-http"
export async function GET(request: NextRequest) {
  return dialogueRoute(async () => {
    const query = dialoguePageInput.safeParse(Object.fromEntries(request.nextUrl.searchParams))
    if (!query.success) throw new DialogueError(400, "筛选链接无效")
    return dialogueJson(await getDialogues(query.data.companyId, query.data.cursor))
  })
}
