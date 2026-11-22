import { dialogueEnabled } from "@/lib/dialogue-feature"

/** Build opt-in cannot be enabled by runtime alone; runtime can disable it. */
export function dialogueServerEnabled() {
  // Unlike a literal process.env.NEXT_PUBLIC_* lookup, this is not build-inlined.
  const runtimeEnvironment = process.env
  return dialogueEnabled({ NEXT_PUBLIC_DIALOGUE_ENABLED: process.env.NEXT_PUBLIC_DIALOGUE_ENABLED }) &&
    dialogueEnabled({ NEXT_PUBLIC_DIALOGUE_ENABLED: runtimeEnvironment.NEXT_PUBLIC_DIALOGUE_ENABLED })
}
