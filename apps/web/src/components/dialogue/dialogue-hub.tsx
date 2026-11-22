"use client"
import Link from "next/link"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-context"
import type { DialogueSession } from "@/lib/dialogue"
import { forumFetch } from "@/components/forum/forum-client"
import { WebButton } from "@/components/ui/web-button"
import { ZaichangIcon } from "@/components/ui/zaichang-icon"
import { useUrlSearchParams } from "@/lib/use-url-search-params"
import { DialogueCard, DialogueErrorState, DialogueHeading, DialogueMoneyNotice } from "./dialogue-common"

export function DialogueHub() {
  const { user } = useAuth(), params = useUrlSearchParams(), companyId = params.get("companyId") ?? ""
  const events = useInfiniteQuery({ queryKey: ["dialogues", "public", companyId], initialPageParam: "", retry: false, staleTime: 30_000,
    queryFn: async ({ pageParam, signal }) => {
      const query = new URLSearchParams()
      if (companyId) query.set("companyId", companyId)
      if (pageParam) query.set("cursor", pageParam)
      const result = await forumFetch<{ sessions: DialogueSession[]; nextCursor: string | null }>(`/api/dialogues${query.size ? `?${query}` : ""}`, { signal })
      if (!Array.isArray(result.sessions)) throw new Error("活动返回格式不正确")
      return result
    }, getNextPageParam: page => page.nextCursor ?? undefined,
  })
  const rows = [...new Map((events.data?.pages.flatMap(page => page.sessions) ?? []).map(row => [row.id, row])).values()]
  return <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
    <DialogueHeading title="在场 · 对话"><div className="flex flex-wrap gap-2"><WebButton asChild variant="secondary" size="sm"><Link href="/me/dialogues">我的报名</Link></WebButton>{user && ["admin", "moderator"].includes(user.role) ? <WebButton asChild variant="quiet" size="sm"><Link href="/moderation/dialogues">活动管理</Link></WebButton> : null}</div></DialogueHeading>
    <DialogueMoneyNotice />
    {companyId ? <p className="mt-4 text-sm text-muted-foreground">当前公司的活动 <Link href="/community/dialogues" className="ml-3 inline-flex min-h-11 items-center underline">查看全部对话</Link></p> : null}
    {events.isPending ? <p role="status" className="py-10 text-sm text-muted-foreground">正在加载对话活动…</p> : events.isError && !events.isFetchNextPageError ? <div className="mt-6"><DialogueErrorState message="对话活动暂时无法加载" retry={() => void events.refetch()} /></div> : !rows.length ? <div className="py-14 text-center"><ZaichangIcon name="quiet" className="mx-auto h-24 w-36 text-primary-deep" /><h2 className="mt-4 font-semibold">还没有公开的对话活动</h2><WebButton asChild variant="secondary" className="mt-5"><Link href="/community">先去社区聊聊</Link></WebButton></div> : rows.map(row => <DialogueCard key={row.id} session={row} />)}
    {events.isFetchNextPageError ? <p role="alert" className="py-4 text-sm text-destructive">后续活动加载失败，已加载内容保留。</p> : null}
    {events.hasNextPage ? <WebButton variant="secondary" className="my-5 w-full" disabled={events.isFetchingNextPage} onClick={() => void events.fetchNextPage()}>{events.isFetchingNextPage ? "正在加载…" : events.isFetchNextPageError ? "重试更多活动" : "更多活动"}</WebButton> : null}
  </section>
}
