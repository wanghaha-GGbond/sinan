import { notFound } from "next/navigation"
import { z } from "zod"
import { dialogueEnabled } from "@/lib/dialogue"
import { DialogueDetail } from "@/components/dialogue/dialogue-detail"
export default async function DialoguePage({ params }: { params: Promise<{ id: string }> }) {
  if (!dialogueEnabled({ NEXT_PUBLIC_DIALOGUE_ENABLED: process.env.NEXT_PUBLIC_DIALOGUE_ENABLED })) notFound()
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  return <DialogueDetail id={id} />
}
