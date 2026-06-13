import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/server/auth"
import { PromiseRecordQueue } from "./promise-record-queue"

export default async function PromiseRecordModerationPage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")
  if (user.role !== "moderator" && user.role !== "admin") redirect("/")
  return <PromiseRecordQueue />
}
