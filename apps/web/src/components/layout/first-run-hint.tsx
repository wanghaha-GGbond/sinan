"use client"

/**
 * First-visit hint.
 *
 * On a brand-new browser, surfaces a one-line banner at the top of
 * the app that points the user at the keyboard cheat sheet. Auto-
 * dismisses after 8 seconds, persists a "seen" flag in localStorage
 * so it never reappears on the same browser. Users who actively
 * close it also set the flag immediately.
 *
 * The hint is intentionally minimal: no overlay, no modal, no
 * spotlight tour. One line, one icon, one dismiss button. Fits
 * Nielsen heuristic #10 (Help and Documentation) without
 * intruding on the actual reading surface.
 */
import { useEffect, useRef, useState } from "react"
import { Keyboard, X } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"

const STORAGE_KEY = "sinan:first-run-hint-seen"
const AUTO_DISMISS_MS = 8_000

export function FirstRunHint() {
  const [visible, setVisible] = useState(false)
  const pendingTimer = useRef<number | null>(null)

  useEffect(() => {
    // Defer the read+show decision to a macrotask so we don't
    // synchronously call setVisible in the effect body. This is the
    // same pattern React's docs recommend for "show on mount" UI.
    const handle = window.setTimeout(() => {
      try {
        if (window.localStorage.getItem(STORAGE_KEY) === "1") return
      } catch {
        // Storage unavailable (private mode) — still show once per session.
      }
      setVisible(true)
      const timer = window.setTimeout(() => {
        setVisible(false)
        try {
          window.localStorage.setItem(STORAGE_KEY, "1")
        } catch {}
      }, AUTO_DISMISS_MS)
      pendingTimer.current = timer
    }, 0)
    return () => {
      window.clearTimeout(handle)
      if (pendingTimer.current !== null) {
        window.clearTimeout(pendingTimer.current)
        pendingTimer.current = null
      }
    }
  }, [])

  function dismiss(persist = true) {
    setVisible(false)
    if (persist) {
      try {
        window.localStorage.setItem(STORAGE_KEY, "1")
      } catch {}
    }
  }

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="first-run-hint"
      className="fixed inset-x-0 top-0 z-40 flex items-center justify-center gap-2 bg-foreground/95 px-4 py-2 text-sm text-background backdrop-blur"
    >
      <Keyboard className="size-4 text-primary" />
      <span>按 <kbd className="rounded border border-background/30 bg-background/10 px-1 font-mono text-xs">?</kbd> 看快捷键 · 一键跳到搜索或公司</span>
      <SolidButton
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => dismiss()}
        aria-label="关闭提示"
        data-testid="first-run-hint-dismiss"
        className="text-background hover:bg-background/10"
      >
        <X className="size-4" />
      </SolidButton>
    </div>
  )
}
