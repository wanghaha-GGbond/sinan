import { dialogueEnabled } from "@/lib/dialogue-feature"

/** Build opt-in cannot be enabled by runtime alone; runtime can disable it. */
export function dialogueServerEnabled() {
  // Use an independent non-public flag: NEXT_PUBLIC_* can be build-inlined.
  const runtimeEnvironment = process.env
  return dialogueEnabled({ NEXT_PUBLIC_DIALOGUE_ENABLED: process.env.NEXT_PUBLIC_DIALOGUE_ENABLED }) &&
    runtimeEnvironment.DIALOGUE_ENABLED === "true"
}
