import { ForumThread } from "@/components/forum/forum-thread"
export default async function ThreadPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params
  return <ForumThread key={postId} postId={postId} />
}
