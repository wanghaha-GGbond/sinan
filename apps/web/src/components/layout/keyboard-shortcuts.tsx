"use client"

/**
 * Global keyboard shortcuts.
 *
 * - `?`  open the cheat-sheet modal
 * - `/`  focus the first search input on the page (if one exists)
 * - `Esc` close the cheat sheet
 *
 * Modest scope by design: shortcuts that require knowing the active
 * page (e.g. `J` / `K` to step through a list) belong to the page
 * itself, not here. This component only wires globally-meaningful
 * navigation + help.
 */
import { useEffect, useState } from "react"
import { Keyboard, X, Search } from "lucide-react"

const CHEAT = [
  { keys: ["?"], label: "看快捷键" },
  { keys: ["/"], label: "聚焦搜索框" },
  { keys: ["Esc"], label: "关弹窗 / 退出编辑" },
] as const

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const isEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)

      // `/` focuses the first search input — skip if already in a field
      if (event.key === "/" && !isEditable && !event.metaKey && !event.ctrlKey) {
        const search = document.querySelector<HTMLInputElement>(
          "input[type=search], input[placeholder*=\"搜索\"], input[aria-label*=\"搜索\"]"
        )
        if (search) {
          event.preventDefault()
          search.focus()
          search.select()
        }
        return
      }

      // `?` opens the cheat sheet — skip if user is mid-typing
      if (event.key === "?" && !isEditable && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        setOpen((v) => !v)
        return
      }

      if (event.key === "Escape" && open) {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center bg-foreground/30 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="键盘快捷键"
          data-testid="kbd-cheatsheet"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-2xl bg-card p-6 shadow-[0_24px_60px_rgba(17,24,39,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Keyboard className="size-4 text-primary" />
                键盘快捷键
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭"
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                data-testid="kbd-cheatsheet-close"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">在任意页面都能用</p>
            <ul className="mt-4 space-y-3">
              {CHEAT.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-foreground">{item.label}</span>
                  <span className="flex items-center gap-1">
                    {item.keys.map((key) => (
                      <kbd
                        key={key}
                        className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-md border border-border bg-muted px-1.5 font-mono text-xs text-foreground"
                      >
                        {key === "?" ? "?" : key === "Esc" ? "Esc" : key === "/" ? "/" : key}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Search className="size-3.5" />
              按 <kbd className="rounded border border-border bg-muted px-1 font-mono">/</kbd> 试试聚焦搜索框
            </p>
          </div>
        </div>
      ) : null}
    </>
  )
}
