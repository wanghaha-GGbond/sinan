"use client"

import { Moon, Sun } from "lucide-react"

import { useTheme } from "@/lib/theme-context"

import { SolidButton } from "./solid-button"

/**
 * Light/dark theme switch. Renders in the topbar's right slot.
 * Drops the label on < sm viewports — the icon is universal.
 *
 * Why only light↔dark (not the full 3-state cycle): a 3-state cycle
 * needs explanation ("what does system mean again?") and most users
 * just want the obvious action. Power users can edit the localStorage
 * key directly. Sprint 16 keeps the affordance surface small.
 */
export function ThemeToggle() {
  const { resolved, toggle } = useTheme()
  const isDark = resolved === "dark"

  return (
    <SolidButton
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
      aria-pressed={isDark}
      data-testid="theme-toggle"
    >
      {isDark ? (
        <Sun className="size-3.5" aria-hidden="true" />
      ) : (
        <Moon className="size-3.5" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{isDark ? "浅色" : "深色"}</span>
    </SolidButton>
  )
}
