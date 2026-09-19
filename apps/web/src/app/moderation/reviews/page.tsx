import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/server/auth"

import { ReviewModerationQueue } from "./review-moderation-queue"

export default async function ReviewModerationPage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")
  if (user.role !== "moderator" && user.role !== "admin") redirect("/")
  return <ReviewModerationQueue />
}
