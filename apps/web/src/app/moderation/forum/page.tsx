import { redirect } from "next/navigation"
import { getAuthUser } from "@/lib/server/auth"
import { ForumModeration } from "@/components/forum/forum-moderation"
export default async function ForumModerationPage() {
  const user = await getAuthUser()
  if (!user) redirect("/login?next=%2Fmoderation%2Fforum")
  if (!["admin", "moderator"].includes(user.role)) redirect("/")
  return <ForumModeration />
}
