import { notFound, redirect } from "next/navigation"
import { dialogueEnabled } from "@/lib/dialogue"
import { getAuthUser } from "@/lib/server/auth"
import { DialogueManagement } from "@/components/dialogue/dialogue-management"
export default async function DialogueManagementPage() {
  if (!dialogueEnabled({ NEXT_PUBLIC_DIALOGUE_ENABLED: process.env.NEXT_PUBLIC_DIALOGUE_ENABLED })) notFound()
  const user = await getAuthUser()
  if (!user) redirect("/login?next=%2Fmoderation%2Fdialogues")
  if (!["admin", "moderator"].includes(user.role)) redirect("/community")
  return <DialogueManagement />
}
