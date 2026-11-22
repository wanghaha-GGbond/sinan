import { Suspense } from "react"
import { connection } from "next/server"
import { ForumHub } from "@/components/forum/forum-hub"
export default async function CommunityPage() {
  // Render the requested board in HTML as well, before client hydration.
  await connection()
  return <Suspense fallback={<p role="status" className="p-6 text-sm text-muted-foreground">正在加载社区…</p>}><ForumHub /></Suspense>
}
