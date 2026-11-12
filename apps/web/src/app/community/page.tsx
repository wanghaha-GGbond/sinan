import { Suspense } from "react"
import { ForumHub } from "@/components/forum/forum-hub"
export default function CommunityPage() {
  return <Suspense fallback={<p role="status" className="p-6 text-sm text-muted-foreground">正在加载社区…</p>}><ForumHub /></Suspense>
}
