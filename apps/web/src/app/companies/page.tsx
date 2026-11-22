import { Suspense } from "react"
import { ForumHub } from "@/components/forum/forum-hub"

// Preserve existing directory URLs and filter bookmarks inside the same space.
export default function CompaniesPage() {
  return <Suspense fallback={<p role="status" className="p-6 text-sm text-muted-foreground">正在加载公司…</p>}><ForumHub directory /></Suspense>
}
