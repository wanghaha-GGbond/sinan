import { cn } from "@/lib/utils"

export type ZaichangIconName = "conversation" | "review" | "company" | "reply" | "agree" | "quiet"

/** Original editable same-origin SVGs. Decorative: the control supplies its name. */
export function ZaichangIcon({ name, className }: { name: ZaichangIconName; className?: string }) {
  return <svg viewBox={name === "quiet" ? "0 0 160 112" : "0 0 24 24"} aria-hidden="true" focusable="false" className={cn("size-5 shrink-0", className)} data-brand-icon={name}>
    <use href={`/brand/${name}.svg#art`} />
  </svg>
}
