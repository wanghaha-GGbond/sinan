import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/server/auth"
import { VerificationQueue } from "./verification-queue"

export default async function CompanyVerificationModerationPage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")
  if (user.role !== "moderator" && user.role !== "admin") redirect("/")
  return <VerificationQueue />
}
