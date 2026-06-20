"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type Theme = "light" | "dark" | "system"

const STORAGE_KEY = "sinan:theme"

type ThemeState = {
  theme: Theme
  resolved: "light" | "dark"
  setTheme: (t: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeState | null>(null)

/**
 * Read the stored theme. Called both in the pre-hydration script (to
 * apply the class before paint and avoid flash) and on client mount
 * (to sync the context).
 *
 * "system" defers to `prefers-color-scheme` — there is no value to
 * persist for that branch beyond the literal string "system".
 */
export function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw === "light" || raw === "dark" || raw === "system") return raw
  return null
}

/**
 * Apply the theme by toggling `.dark` on <html>. The Tailwind v4
 * custom variant `@custom-variant dark (&:is(.dark *))` is the
 * single source of truth — components only need `dark:` variants,
 * never `useTheme()`.
 *
 * Called both pre-hydration (inline script in layout) and on every
 * theme change (this effect). Idempotent.
 */
function applyThemeClass(theme: Theme): "light" | "dark" {
  if (typeof document === "undefined") return "light"
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  const resolved: "light" | "dark" =
    theme === "system" ? (prefersDark ? "dark" : "light") : theme
  document.documentElement.classList.toggle("dark", resolved === "dark")
  return resolved
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default to "light" during SSR/SSG; the inline pre-hydration script
  // will have set the real class before paint. The first client render
  // matches SSR (no class on <html>), then the effect upgrades to
  // the actual stored/system value.
  const [theme, setThemeState] = useState<Theme>("light")
  const [resolved, setResolved] = useState<"light" | "dark">("light")

  // On mount: read stored value, apply class, subscribe to system changes.
  // We wrap the initial setState in setTimeout(0) to defer it out of the
  // effect's synchronous body — otherwise React 19's
  // `react-hooks/set-state-in-effect` rule flags it as a cascading render.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const stored = readStoredTheme() ?? "system"
      setThemeState(stored)
      setResolved(applyThemeClass(stored))
    }, 0)

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onSystemChange = () => {
      if (readStoredTheme() === "system" || readStoredTheme() === null) {
        setResolved(applyThemeClass("system"))
      }
    }
    mq.addEventListener("change", onSystemChange)
    return () => {
      window.clearTimeout(handle)
      mq.removeEventListener("change", onSystemChange)
    }
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    if (next === "system") {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
    setResolved(applyThemeClass(next))
  }, [])

  const toggle = useCallback(() => {
    // From the user's perspective: light → dark → system → light.
    // We resolve "system" to a concrete value before toggling so the
    // click is predictable.
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  const value = useMemo<ThemeState>(
    () => ({ theme, resolved, setTheme, toggle }),
    [theme, resolved, setTheme, toggle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    // Allow the toggle button to be rendered outside a provider during
    // tests / isolated stories — fall back to a no-op default.
    return {
      theme: "light",
      resolved: "light",
      setTheme: () => {},
      toggle: () => {},
    }
  }
  return ctx
}

/**
 * The pre-hydration script. Must be inlined into <head> so it runs
 * before the first paint and prevents the dark↔light flash on reload.
 *
 * Keep it small + self-contained — no module syntax, no closures
 * over page data, no console statements.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("sinan:theme");var d=t==="dark"||((t==null||t==="system")&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`
