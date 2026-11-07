"use client"

import { useSyncExternalStore } from "react"
import { useSearchParams } from "next/navigation"

const changeEvent = "zaichang:query-change"

function subscribe(notify: () => void) {
  window.addEventListener("popstate", notify)
  window.addEventListener(changeEvent, notify)
  return () => {
    window.removeEventListener("popstate", notify)
    window.removeEventListener(changeEvent, notify)
  }
}

function getSnapshot() { return window.location.search.slice(1) }

// Native history updates do not fetch an RSC payload. The external-store
// notification also updates controlled inputs synchronously; Next's router
// update alone is transitional and can briefly restore a checkbox's old value.
export function useUrlSearchParams() {
  const serverParams = useSearchParams()
  const search = useSyncExternalStore(subscribe, getSnapshot, () => serverParams.toString())
  return new URLSearchParams(search)
}

export function replaceUrlSearchParams(params: URLSearchParams) {
  const search = params.toString()
  window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`)
  window.dispatchEvent(new Event(changeEvent))
}
