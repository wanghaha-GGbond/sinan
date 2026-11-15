"use client"
import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query"
import { MessageCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCompanySearch } from "@/lib/queries/company-search"
import { replaceUrlSearchParams, useUrlSearchParams } from "@/lib/use-url-search-params"
import { withNext } from "@/lib/navigation"
import { forumCategories, type ForumPage, type ForumPost } from "@/lib/forum"
import { WebButton } from "@/components/ui/web-button"
import { CompanyLogo } from "@/components/company/company-logo"
import type { CompanyListItem } from "@/lib/types"
import { PostComposer } from "./post-composer"
import { ForumActions } from "./forum-actions"
import { forumFetch, forumBody } from "./forum-client"

const LegacyReviewCommunity = dynamic(() => import("./legacy-review-community").then(m => m.LegacyReviewCommunity))

export function ForumHub({ company }: { company?: CompanyListItem }) {
  const { user, loading } = useAuth(), params = useUrlSearchParams(), client = useQueryClient()
  const catalog = useCompanySearch()
  const companies = useMemo(() => company && !catalog.data?.some(c => c.id === company.id) ? [company, ...(catalog.data ?? [])] : catalog.data ?? [], [catalog.data, company])
  const companyId = company?.id ?? params.get("companyId") ?? "", selected = companies.find(c => c.id === companyId)
  const feed = params.get("feed") === "mine" ? "mine" : params.get("feed") === "following" ? "following" : "all"
  const sort = params.get("sort") === "useful" ? "useful" : "latest", category = params.get("category") ?? "", q = params.get("q") ?? ""
  const legacy = !company && params.get("view") === "reviews"
  const [search, setSearch] = useState(""), [expanded, setExpanded] = useState(false)
  const [followError, setFollowError] = useState(""), [followingBusy, setFollowingBusy] = useState(false), followLock = useRef(false)
  const returnTo = `${company ? `/company/${company.id}/community` : "/community"}${params.size ? `?${params}` : ""}`
  const follows = useQuery({ queryKey: ["forum", "follows", user?.id], enabled: !loading && Boolean(user), queryFn: () => forumFetch<{ companyIds: string[] }>("/api/forum/follows"), staleTime: 0, gcTime: 0, retry: false })
  const posts = useInfiniteQuery({
    queryKey: ["forum", "posts", user?.id ?? "anonymous", companyId, feed, sort, category, q], initialPageParam: "",
    enabled: !loading && !legacy && (feed === "all" || Boolean(user)),
    queryFn: ({ pageParam, signal }) => {
      const query = new URLSearchParams({ feed, sort })
      if (companyId) query.set("companyId", companyId)
      if (category) query.set("category", category)
      if (q) query.set("q", q)
      if (pageParam) query.set("cursor", pageParam)
      return forumFetch<ForumPage>(`/api/forum/posts?${query}`, { signal })
    }, getNextPageParam: page => page.nextCursor ?? undefined, staleTime: 0, gcTime: 0, retry: false,
  })
  const rows = Array.from(new Map((posts.data?.pages.flatMap(p => p.posts) ?? []).map(p => [p.id, p])).values())
  const matching = companies.filter(c => `${c.name} ${c.shortName ?? ""}`.toLowerCase().includes(search.toLowerCase()))
  function filter(key: string, value: string) { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); replaceUrlSearchParams(next) }
  function companyHref(id?: string) {
    const next = new URLSearchParams()
    for (const key of ["feed", "category", "sort", "q"]) {
      const value = params.get(key)
      if (value) next.set(key, value)
    }
    return `${id ? `/company/${id}/community` : "/community"}${next.size ? `?${next}` : ""}`
  }
  function clearFilters() {
    const next = new URLSearchParams(params)
    next.delete("category"); next.delete("companyId"); next.delete("cursor"); next.delete("q")
    replaceUrlSearchParams(next)
  }
  function compose() {
    const element = document.getElementById("forum-composer")
    if (element instanceof HTMLDetailsElement) element.open = true
    element?.scrollIntoView({ block: "center", behavior: "instant" })
    element?.querySelector<HTMLElement>("input, select, a")?.focus()
  }
  async function follow() {
    if (!selected || !user || followLock.current || !follows.data) return
    followLock.current = true; setFollowingBusy(true); setFollowError("")
    const following = !follows.data.companyIds.includes(selected.id)
    try {
      const result = await forumFetch<{ companyId: string; following: boolean }>("/api/forum/follows", forumBody("PUT", { companyId: selected.id, following }))
      if (result.companyId !== selected.id || result.following !== following) throw new Error("未能确认关注结果")
      await client.invalidateQueries({ queryKey: ["forum"] })
    } catch (e) { setFollowError(e instanceof Error ? e.message : "操作失败") }
    finally { followLock.current = false; setFollowingBusy(false) }
  }
  return <section data-testid="forum-hub" className={`${company ? "mt-6" : "bg-muted px-4 py-7 sm:px-8 sm:py-10"} break-normal`}><div className="mx-auto w-full max-w-page">
    {!company && <header className="mb-5"><h1 className="text-3xl font-semibold">社区</h1><p className="mt-2 text-sm text-muted-foreground">公司里的事，和同行聊聊。</p></header>}
    <nav aria-label="社区板块" className="mb-5 flex gap-5 border-b border-border text-sm font-semibold">
      <Link className={`inline-flex min-h-12 items-center border-b-2 focus-visible:outline-2 focus-visible:outline-ring ${!legacy ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`} href={company ? `/company/${company.id}/community` : "/community"} aria-current={!legacy ? "page" : undefined}>公司论坛</Link>
      <Link className={`inline-flex min-h-12 items-center border-b-2 focus-visible:outline-2 focus-visible:outline-ring ${legacy ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`} href={`/community?view=reviews${companyId ? `&companyId=${encodeURIComponent(companyId)}` : ""}`} aria-current={legacy ? "page" : undefined}>评价讨论</Link>
      {user && ["admin", "moderator"].includes(user.role) && <Link className="ml-auto inline-flex min-h-12 items-center" href="/moderation/forum">审核队列</Link>}
    </nav>
    {legacy ? <LegacyReviewCommunity embedded /> : <div className="grid items-start gap-5 min-[1200px]:grid-cols-[220px_minmax(0,1fr)_200px]">
      <aside className="min-w-0 rounded-xl border border-border bg-card p-4" aria-label="公司论坛目录">
        <h2 className="font-semibold">公司论坛</h2>
        <label className="sr-only" htmlFor="forum-company-search">查找公司论坛</label><input id="forum-company-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="查找公司" className="my-3 min-h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-ring" />
        <div className="flex gap-2 overflow-x-auto pb-1 min-[1200px]:flex-col">
          <Link href={companyHref()} className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 text-sm hover:bg-muted">全部公司</Link>
          {(expanded || search ? matching : matching.slice(0, 8)).map(c => <Link key={c.id} href={companyHref(c.id)} aria-current={companyId === c.id ? "page" : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-2 text-sm hover:bg-muted ${companyId === c.id ? "bg-primary-tint font-medium text-primary-deep" : ""}`}><CompanyLogo company={c} className="size-7 rounded-md p-1 text-xs sm:size-7" /><span>{c.shortName || c.name}</span></Link>)}
        </div>
        {catalog.isPending && <p role="status" className="py-2 text-xs text-muted-foreground">正在加载公司…</p>}
        {catalog.isError && <button type="button" className="min-h-11 text-sm underline" onClick={() => void catalog.refetch()}>重新加载公司</button>}
        {!catalog.isPending && !catalog.isError && !matching.length && <p className="py-2 text-sm text-muted-foreground">没有匹配的公司</p>}
        {!search && matching.length > 8 && <button type="button" className="mt-2 min-h-11 text-sm text-primary-deep" onClick={() => setExpanded(!expanded)}>{expanded ? "收起公司" : `查看全部 ${matching.length} 家公司`}</button>}
      </aside>
      <div className="min-w-0 space-y-4">
        {selected && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5"><div><h2 className="font-semibold">{selected.name}论坛</h2><Link className="mt-1 inline-flex min-h-11 items-center text-xs text-muted-foreground underline" href={`/company/${selected.id}`}>公司资料与评分</Link></div>{user ? <WebButton size="sm" variant="secondary" disabled={followingBusy || !follows.data} onClick={() => void follow()}>{follows.data?.companyIds.includes(selected.id) ? "已关注" : "关注公司"}</WebButton> : <WebButton asChild variant="secondary" size="sm"><Link href={withNext("/login", returnTo)}>关注公司</Link></WebButton>}</div>}
        {follows.isError && user && <p role="alert" className="text-sm text-destructive">关注列表暂不可用。<button type="button" onClick={() => void follows.refetch()} className="ml-2 min-h-11 underline">重试关注列表</button></p>}
        {followError && <p role="alert" className="text-sm text-destructive">{followError}</p>}
        <PostComposer companies={companies} companyId={companyId} returnTo={returnTo} />
        <ForumSearch key={q} query={q} onSearch={value => filter("q", value)} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1" aria-label="动态范围">{([["all", "全部动态"], ["following", "关注的公司"], ["mine", "我的发布"]] as const).map(([v, label]) => <button key={v} type="button" aria-pressed={feed === v} onClick={() => filter("feed", v === "all" ? "" : v)} className={`min-h-11 rounded-lg px-3 text-sm ${feed === v ? "bg-primary-tint font-medium text-primary-deep" : "text-muted-foreground hover:bg-muted"}`}>{label}</button>)}</div>
          <select aria-label="论坛排序" value={sort} onChange={e => filter("sort", e.target.value === "latest" ? "" : e.target.value)} className="min-h-11 rounded-lg border border-border bg-card px-3 text-sm"><option value="latest">最新发布</option><option value="useful">最多赞同</option></select>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="论坛话题">{[["", "全部话题"], ...Object.entries(forumCategories)].map(([v, label]) => <button type="button" key={v} aria-pressed={category === v} onClick={() => filter("category", v)} className={`min-h-11 rounded-full border px-3 text-xs ${category === v ? "border-primary bg-primary-tint text-primary-deep" : "border-border bg-card text-muted-foreground"}`}>{label}</button>)}</div>
        {feed !== "all" && !user && !loading ? <div className="rounded-xl border border-border bg-card p-6"><WebButton asChild variant="secondary"><Link href={withNext("/login", returnTo)}>登录后查看{feed === "mine" ? "我的发布" : "关注动态"}</Link></WebButton></div>
          : posts.isPending ? <p role="status" className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">正在加载论坛…</p>
          : posts.isError && !posts.isFetchNextPageError ? <div role="alert" className="rounded-xl border border-border bg-card p-6"><p className="text-sm">论坛暂时无法加载</p><WebButton variant="secondary" size="sm" className="mt-3" onClick={() => void posts.refetch()}>重试论坛</WebButton></div>
          : rows.length === 0 ? <div className="rounded-xl border border-border bg-card px-5 py-10 text-center"><MessageCircle className="mx-auto size-7 text-muted-foreground" aria-hidden="true" /><h2 className="mt-3 font-semibold">{feed === "following" && follows.data?.companyIds.length === 0 ? "你还没有关注公司" : q || category || (!company && companyId) ? "没有符合筛选的帖子" : feed === "mine" ? "你还没有发布帖子" : feed === "following" ? "关注的公司还没有新帖子" : "还没有公开帖子"}</h2><div className="mt-4 flex flex-wrap justify-center gap-2">{q || category || (!company && companyId) ? <WebButton variant="secondary" onClick={clearFilters}>清除筛选</WebButton> : null}{feed === "following" ? <WebButton asChild variant="secondary"><Link href="/community">发现公司论坛</Link></WebButton> : <WebButton variant="secondary" onClick={compose}>发起讨论</WebButton>}</div></div>
          : rows.map(post => <ForumPostCard key={post.id} post={post} />)}
        {posts.isFetchNextPageError && <p role="alert" className="text-sm text-destructive">后续帖子加载失败，已加载内容保留。</p>}
        {posts.hasNextPage && <WebButton variant="secondary" disabled={posts.isFetchingNextPage} className="w-full" onClick={() => void posts.fetchNextPage()}>{posts.isFetchingNextPage ? "正在加载…" : posts.isFetchNextPageError ? "重试更多帖子" : "更多帖子"}</WebButton>}
      </div>
      <aside className="hidden rounded-xl border border-border bg-card p-5 min-[1200px]:block" aria-label="社区快捷入口"><h2 className="font-semibold">在场社区</h2><div className="mt-3 grid gap-1"><Link href="/community?feed=following" className="inline-flex min-h-11 items-center text-sm">关注的公司</Link><Link href="/community?feed=mine" className="inline-flex min-h-11 items-center text-sm">我的发布</Link><Link href="/companies" className="inline-flex min-h-11 items-center text-sm">公司评分</Link><Link href="/research" className="inline-flex min-h-11 items-center text-sm">公司研究</Link></div><p className="mt-5 border-t border-border pt-4 text-xs leading-6 text-muted-foreground">讨论具体经历，不公开他人隐私。</p></aside>
    </div>}
  </div></section>
}
function ForumSearch({ query, onSearch }: { query: string; onSearch: (value: string) => void }) {
  const [value, setValue] = useState(query)
  return <form role="search" aria-label="论坛帖子搜索" className="flex gap-2" onSubmit={event => { event.preventDefault(); onSearch(value.trim()) }}><label className="sr-only" htmlFor="forum-post-search">搜索帖子</label><input id="forum-post-search" type="search" maxLength={80} value={value} onChange={event => setValue(event.target.value)} placeholder="搜索讨论内容" className="min-h-11 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm" /><WebButton type="submit" variant="secondary">搜索</WebButton>{query ? <WebButton type="button" variant="quiet" onClick={() => onSearch("")}>清除搜索</WebButton> : null}</form>
}
function ForumPostCard({ post }: { post: ForumPost }) {
  return <article data-testid="forum-post" className="rounded-xl border border-border bg-card p-5 sm:p-6">
    <div className="flex items-start gap-3"><CompanyLogo company={{ id: post.companyId, name: post.companyName }} className="size-10 sm:size-10" /><div className="min-w-0 flex-1"><Link href={`/company/${post.companyId}/community`} className="text-sm font-semibold hover:underline">{post.companyName}</Link><p className="mt-1 text-xs text-muted-foreground">{post.authorLabel} · {new Date(post.createdAt).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" })}</p></div><span className="rounded-md bg-muted px-2 py-1 text-xs">{forumCategories[post.category]}</span></div>
    <Link href={`/community/${post.id}`} className="mt-4 block"><h2 className="break-words text-lg font-semibold leading-7">{post.title}</h2><p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-sm leading-7 text-foreground/85">{post.content}</p></Link>
    {post.status !== "visible" && <p className="mt-3 text-xs text-muted-foreground">{post.status === "pending_review" ? "等待审核" : post.status === "rejected" ? "未通过审核" : "暂不公开"} · 仅自己可见</p>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">{post.status === "visible" ? <ForumActions postId={post.id} usefulCount={post.usefulCount} isUseful={post.isUseful} /> : <span />}<Link href={`/community/${post.id}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground"><MessageCircle className="size-4" aria-hidden="true" />{post.replyCount} 条回复</Link></div>
  </article>
}
