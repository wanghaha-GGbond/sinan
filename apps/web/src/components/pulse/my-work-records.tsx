"use client"

import dynamic from "next/dynamic"
import { useState, useSyncExternalStore } from "react"
import { Activity, ChevronDown } from "lucide-react"

const PersonalRecords = dynamic(() => import("./personal-pulse-dashboard").then(module => module.PersonalPulseDashboard), {
  loading: () => <p role="status" className="py-6 text-sm text-muted-foreground">正在加载工作记录…</p>,
})
const subscribe = (notify: () => void) => {
  window.addEventListener("hashchange", notify)
  window.addEventListener("popstate", notify)
  return () => { window.removeEventListener("hashchange", notify); window.removeEventListener("popstate", notify) }
}
const requested = () => window.location.hash === "#work-records"
const serverRequested = () => false
export function useWorkRecordsRequested() { return useSyncExternalStore(subscribe, requested, serverRequested) }

export function MyWorkRecords() {
  const fromLink = useWorkRecordsRequested()
  const [override, setOverride] = useState<boolean | null>(null)
  const open = override ?? fromLink
  return <section id="work-records" className="scroll-mt-24 rounded-xl border border-border bg-card">
    <button type="button" aria-expanded={open} aria-controls="my-work-records-content" onClick={() => setOverride(!open)} className="flex min-h-16 w-full items-center gap-3 px-5 text-left focus-visible:outline-2 focus-visible:outline-ring">
      <Activity className="size-5 text-primary-deep" aria-hidden="true" /><span className="flex-1 text-sm font-semibold">工作记录</span><span className="text-xs text-muted-foreground">打卡与周报</span><ChevronDown className={`size-4 text-muted-foreground ${open ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
    {open ? <div id="my-work-records-content" className="border-t border-border px-3 py-5 sm:px-5"><PersonalRecords /></div> : null}
  </section>
}
