export function dialogueEnabled(env: { NEXT_PUBLIC_DIALOGUE_ENABLED?: string }) {
  return env.NEXT_PUBLIC_DIALOGUE_ENABLED === "true"
}
const dialoguePaths = ["/community/dialogues", "/me/dialogues", "/moderation/dialogues", "/api/dialogues", "/api/me/dialogues", "/api/moderation/dialogues"]
export function isDialoguePath(path: string) {
  return dialoguePaths.some(base => path === base || path.startsWith(`${base}/`))
}
