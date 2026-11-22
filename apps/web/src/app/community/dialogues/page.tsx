import { Suspense } from "react"
import { notFound } from "next/navigation"
import { dialogueEnabled } from "@/lib/dialogue"
import { DialogueHub } from "@/components/dialogue/dialogue-hub"
export default function DialoguesPage() {
  if (!dialogueEnabled({ NEXT_PUBLIC_DIALOGUE_ENABLED: process.env.NEXT_PUBLIC_DIALOGUE_ENABLED })) notFound()
  return <Suspense fallback={<p role="status" className="p-6">正在加载活动…</p>}><DialogueHub /></Suspense>
}
