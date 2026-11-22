import { notFound } from "next/navigation"
import { dialogueEnabled } from "@/lib/dialogue"
import { MyDialogues } from "@/components/dialogue/my-dialogues"
export default function MyDialoguesPage() {
  if (!dialogueEnabled({ NEXT_PUBLIC_DIALOGUE_ENABLED: process.env.NEXT_PUBLIC_DIALOGUE_ENABLED })) notFound()
  return <MyDialogues />
}
