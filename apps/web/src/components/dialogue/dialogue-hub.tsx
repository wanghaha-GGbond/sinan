"use client"
import Link from "next/link"
import { ArrowRight, Ticket } from "lucide-react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-context"
import type { DialogueSession } from "@/lib/dialogue"
import { pointsEnabled } from "@/lib/points"
import { forumFetch } from "@/components/forum/forum-client"
import { WebButton } from "@/components/ui/web-button"
import { useUrlSearchParams } from "@/lib/use-url-search-params"
import { DialogueCard, DialogueErrorState, DialogueHeading, DialogueMoneyNotice } from "./dialogue-common"
import { DialogueRoomArt } from "./dialogue-room-art"
import styles from "./dialogue-design.module.css"

export function DialogueHub() {
  const { user } = useAuth(), params = useUrlSearchParams(), companyId = params.get("companyId") ?? ""
  const events = useInfiniteQuery({ queryKey: ["dialogues", "public", companyId], initialPageParam: "", retry: false, staleTime: 30_000,
    queryFn: async ({ pageParam, signal }) => {
      const query = new URLSearchParams()
      if (companyId) query.set("companyId", companyId)
      if (pageParam) query.set("cursor", pageParam)
      const result = await forumFetch<{ sessions: DialogueSession[]; nextCursor: string | null }>("/api/dialogues" + (query.size ? "?" + query : ""), { signal })
      if (!Array.isArray(result.sessions)) throw new Error("活动返回格式不正确")
      return result
    }, getNextPageParam: page => page.nextCursor ?? undefined,
  })
  const rows = [...new Map((events.data?.pages.flatMap(page => page.sessions) ?? []).map(row => [row.id, row])).values()]
  return <section className={styles.surface}>
    <DialogueHeading title="在场 · 对话"><div className="flex flex-wrap gap-2"><WebButton asChild variant="secondary" size="sm"><Link href="/me/dialogues"><Ticket size={15} aria-hidden="true" />我的报名</Link></WebButton>{user && ["admin", "moderator"].includes(user.role) ? <WebButton asChild variant="quiet" size="sm"><Link href="/moderation/dialogues">活动管理</Link></WebButton> : null}</div></DialogueHeading>
    <div className={styles.hero} data-testid="dialogue-editorial-hero">
      <div className={styles.heroCopy}><p className={styles.heroLabel + " " + styles.eyebrow} aria-hidden="true">ZAICHANG SESSIONS</p><h2 className={styles.heroTitle}>坐下来，<br /><span>聊点真的。</span></h2><p className={styles.heroDescription}>工作、选择，还有那些没来得及问的问题。</p><a className={styles.heroAction} href="#dialogue-events">浏览对话<ArrowRight size={16} aria-hidden="true" /></a></div>
      <div className={styles.heroArt}><DialogueRoomArt /></div>
      <div className={styles.heroFoot}><span>关于工作，也关于人。</span><span aria-hidden="true">TWO CHAIRS. ONE CONVERSATION.</span></div>
    </div>
    <div className={styles.sectionHeading} id="dialogue-events"><h2 className={styles.sectionTitle}>{companyId ? "这家公司的对话" : "近期对话"}</h2>{companyId ? <Link href="/community/dialogues" className="inline-flex min-h-11 items-center text-xs text-primary-deep">查看全部对话<ArrowRight size={14} className="ml-2" aria-hidden="true" /></Link> : <span className={styles.sectionNote}>免费报名 · 入选后参加</span>}</div>
    {events.isPending ? <div role="status" aria-label="正在加载对话活动" className={styles.loadingGrid}><span className="sr-only">正在加载对话活动…</span><div className={styles.loadingCard} aria-hidden="true" /><div className={styles.loadingCard} aria-hidden="true" /></div> : events.isError && !events.isFetchNextPageError ? <DialogueErrorState message="对话活动暂时无法加载" retry={() => void events.refetch()} /> : !rows.length ? <div className={styles.emptyState}><h2>还没有公开的对话活动</h2><p>新活动会出现在这里，先去社区逛逛。</p><WebButton asChild variant="secondary" className="mt-5"><Link href="/community">先去社区聊聊</Link></WebButton></div> : <div className={styles.sessionGrid} data-single={rows.length === 1}>{rows.map(row => <DialogueCard key={row.id} session={row} />)}</div>}
    {events.isFetchNextPageError ? <p role="alert" className="py-4 text-sm text-destructive">后续活动加载失败，已加载内容保留。</p> : null}
    {events.hasNextPage ? <WebButton variant="secondary" className="my-5 w-full" disabled={events.isFetchingNextPage} onClick={() => void events.fetchNextPage()}>{events.isFetchingNextPage ? "正在加载…" : events.isFetchNextPageError ? "重试更多活动" : "更多活动"}</WebButton> : null}
    {pointsEnabled() ? <Link href="/me/points" className="inline-flex min-h-11 items-center text-sm text-primary underline">我的积分与任务</Link> : null}
    <DialogueMoneyNotice points={pointsEnabled()} />
  </section>
}
