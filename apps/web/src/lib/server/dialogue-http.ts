import { NextResponse, type NextRequest } from "next/server"
import { DialogueError } from "@/lib/dialogue"
import { ForumError } from "@/lib/forum"
import { dialogueServerEnabled } from "./dialogue-feature"
export { forumUser as dialogueUser, readForumJson as readDialogueJson, limitForumWrite as limitDialogueWrite } from "./forum-http"
export function ensureDialogueEnabled() {
  if (!dialogueServerEnabled()) throw new DialogueError(404, "Not found")
}
export function dialogueJson(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } }) }
export async function dialogueRoute(action: () => Promise<Response>) {
  try { ensureDialogueEnabled(); return await action() }
  catch (error) {
    if (error instanceof Response) { const headers = new Headers(error.headers); headers.set("Cache-Control", "private, no-store"); return new Response(error.body, { status: error.status, headers }) }
    if (error instanceof DialogueError || error instanceof ForumError) return dialogueJson({ error: error.message }, error.status)
    console.error(JSON.stringify({ event: "dialogue_request_failed", release: process.env.APP_RELEASE }))
    return dialogueJson({ error: "对话活动暂时不可用，请重试" }, 503)
  }
}
export function dialogueId(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new DialogueError(400, "活动链接无效")
  return value
}
export async function dialogueModerator(request: NextRequest) {
  const { requireModerator } = await import("./auth")
  return requireModerator(request)
}
