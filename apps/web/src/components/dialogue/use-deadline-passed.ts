"use client"
import { useCallback, useSyncExternalStore } from "react"

const serverSnapshot = () => false
/** Deadline transitions without reading an unstable clock during render. */
export function useDeadlinePassed(deadline: number) {
  const snapshot = useCallback(() => Date.now() >= deadline, [deadline])
  const subscribe = useCallback((notify: () => void) => {
    let timer: ReturnType<typeof setTimeout>
    const update = () => {
      clearTimeout(timer); notify()
      if (Date.now() < deadline) timer = setTimeout(update, Math.min(2_147_483_647, Math.max(1, deadline - Date.now() + 1)))
    }
    timer = setTimeout(update, Math.min(2_147_483_647, Math.max(1, deadline - Date.now() + 1)))
    window.addEventListener("focus", update)
    return () => { clearTimeout(timer); window.removeEventListener("focus", update) }
  }, [deadline])
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
