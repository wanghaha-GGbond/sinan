import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/server/auth"
import { ProfileFieldQueue } from "./profile-field-queue"

export default async function ProfileFieldModerationPage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")
  if (user.role !== "moderator" && user.role !== "admin") redirect("/")
  return <ProfileFieldQueue />
}
