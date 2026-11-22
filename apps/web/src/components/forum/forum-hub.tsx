"use client"
import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query"
import { SlidersHorizontal, ChevronDown } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCompanySearch } from "@/lib/queries/company-search"
import { replaceUrlSearchParams, useUrlSearchParams } from "@/lib/use-url-search-params"
import { withNext } from "@/lib/navigation"
import { forumCategories, type ForumPage, type ForumPost } from "@/lib/forum"
import { WebButton } from "@/components/ui/web-button"
import { CompanyLogo } from "@/components/company/company-logo"
import { ZaichangIcon } from "@/components/ui/zaichang-icon"
import type { CompanyListItem } from "@/lib/types"
import { PostComposer } from "./post-composer"
import { ForumActions } from "./forum-actions"
import { forumFetch, forumBody } from "./forum-client"

const LegacyReviewCommunity = dynamic(() => import("./legacy-review-community").then(m => m.LegacyReviewCommunity))
const CompanyReviewFeed = dynamic(() => import("./company-review-feed").then(m => m.CompanyReviewFeed))
const CompanyDiscovery = dynamic(() => import("@/components/company/company-discovery").then(m => m.CompanyDiscovery), { loading: () => <p role="status" className="p-6 text-sm text-muted-foreground">正在加载公司…</p> })
const CompanyDirectoryPanel = dynamic(() => import("@/components/company/company-directory-panel").then(m => m.CompanyDirectoryPanel), { loading: () => <p role="status" className="p-6 text-sm text-muted-foreground">正在加载公司目录…</p> })

function ReviewDiscussions() {
  const [opened, setOpened] = useState(false)
  return <details className="border-t border-border" data-testid="legacy-review-discussions" onToggle={event => { if (event.currentTarget.open) setOpened(true) }}>
    <summary className="min-h-12 cursor-pointer px-4 py-4 text-sm text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring sm:px-6">评价下的追问与补充</summary>
    {opened ? <LegacyReviewCommunity embedded /> : null}
  </details>
}

export function ForumHub({ company, directory = false }: { company?: CompanyListItem; directory?: boolean }) {
  const { user, loading } = useAuth(), params = useUrlSearchParams(), client = useQueryClient()
  const catalog = useCompanySearch()
  const companies = useMemo(() => company && !catalog.data?.some(c => c.id === company.id) ? [company, ...(catalog.data ?? [])] : catalog.data ?? [], [catalog.data, company])
  const companyId = company?.id ?? params.get("companyId") ?? "", selected = companies.find(c => c.id === companyId)
  const feed = params.get("feed") === "mine" ? "mine" : params.get("feed") === "following" ? "following" : "all"
  const sort = params.get("sort") === "useful" ? "useful" : "latest", category = params.get("category") ?? "", q = params.get("q") ?? ""
  const finding = !company && (directory || params.get("view") === "companies")
  const legacy = !finding && !company && params.get("view") === "reviews"
  const [search, setSearch] = useState(""), [expanded, setExpanded] = useState(false)
  const [directoryOpen, setDirectoryOpen] = useState(false)
  const [followError, setFollowError] = useState(""), [followingBusy, setFollowingBusy] = useState(false), followLock = useRef(false)
  const returnTo = `${company ? `/company/${company.id}/community` : "/community"}${params.size ? `?${params}` : ""}`
  const follows = useQuery({ queryKey: ["forum", "follows", user?.id], enabled: !loading && Boolean(user) && !finding, queryFn: () => forumFetch<{ companyIds: string[] }>("/api/forum/follows"), staleTime: 0, gcTime: 0, retry: false })
  const posts = useInfiniteQuery({
    queryKey: ["forum", "posts", user?.id ?? "anonymous", companyId, feed, sort, category, q], initialPageParam: "",
    enabled: !loading && !legacy && !finding && (feed === "all" || Boolean(user)),
    queryFn: async ({ pageParam, signal }) => {
      const query = new URLSearchParams({ feed, sort })
      if (companyId) query.set("companyId", companyId)
      if (category) query.set("category", category)
      if (q) query.set("q", q)
      if (pageParam) query.set("cursor", pageParam)
      const result = await forumFetch<ForumPage>(`/api/forum/posts?${query}`, { signal })
      if (!Array.isArray(result.posts)) throw new Error("帖子返回格式不正确")
      return result
    }, getNextPageParam: page => page.nextCursor ?? undefined, staleTime: 0, gcTime: 0, retry: false,
  })
  const rows = Array.from(new Map((posts.data?.pages.flatMap(p => p.posts) ?? []).map(p => [p.id, p])).values())
  const matching = companies.filter(c => `${c.name} ${c.shortName ?? ""}`.toLowerCase().includes(search.toLowerCase()))
  function filter(key: string, value: string) { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); replaceUrlSearchParams(next) }
  function switchBoard(value: string) {
    if ((params.get("view") ?? "") === value) return
    const next = value === "companies" ? new URLSearchParams() : new URLSearchParams(params)
    if (value) next.set("view", value); else next.delete("view")
    replaceUrlSearchParams(next, "push")
  }
  function boardHref(value: string) {
    const next = directory || value === "companies" ? new URLSearchParams() : new URLSearchParams(params)
    if (value) next.set("view", value); else next.delete("view")
    if (company) next.set("companyId", company.id)
    return `/community${next.size ? `?${next}` : ""}`
  }
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
  const reviewHref = `/submit/review${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ""}`
  return <section data-testid="forum-hub" className={`${company ? "mt-5" : "bg-background sm:px-6"} break-normal`}><div className="mx-auto w-full max-w-5xl sm:border-x sm:border-border">
    {!company && <header className="flex items-center justify-between gap-3 px-4 py-5 sm:px-6"><div className="flex items-center gap-2.5"><ZaichangIcon name="conversation" className="size-7 text-primary-deep" /><h1 className="text-xl font-semibold tracking-tight">社区</h1></div><WebButton asChild variant="secondary" size="sm"><Link href={reviewHref}><ZaichangIcon name="review" />写评价</Link></WebButton></header>}
    {!company && <nav aria-label="社区板块" className="flex flex-wrap gap-x-4 border-b border-border px-4 text-sm font-semibold sm:gap-x-6 sm:px-6">
      <Link className={`inline-flex min-h-12 items-center gap-2 border-b-2 focus-visible:outline-2 focus-visible:outline-ring ${!legacy && !finding ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`} href={boardHref("")} onNavigate={directory ? undefined : event => { event.preventDefault(); switchBoard("") }} aria-current={!legacy && !finding ? "page" : undefined}><ZaichangIcon name="conversation" className="size-4" />聊工作</Link>
      <Link className={`inline-flex min-h-12 items-center gap-2 border-b-2 focus-visible:outline-2 focus-visible:outline-ring ${legacy ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`} href={boardHref("reviews")} onNavigate={directory ? undefined : event => { event.preventDefault(); switchBoard("reviews") }} aria-current={legacy ? "page" : undefined}><ZaichangIcon name="review" className="size-4" />公司评价</Link>
      <Link className={`inline-flex min-h-12 items-center gap-2 border-b-2 focus-visible:outline-2 focus-visible:outline-ring ${finding ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`} href={boardHref("companies")} onNavigate={directory ? undefined : event => { event.preventDefault(); switchBoard("companies") }} aria-current={finding ? "page" : undefined}><ZaichangIcon name="company" className="size-4" />找公司</Link>
      {user && ["admin", "moderator"].includes(user.role) && <Link className="ml-auto inline-flex min-h-12 items-center" href="/moderation/forum">审核队列</Link>}
    </nav>}
    {finding ? directory ? <CompanyDirectoryPanel /> : <CompanyDiscovery /> : legacy ? <><CompanyReviewFeed companyId={companyId} companies={companies} /><ReviewDiscussions /></> : <div className="grid items-start lg:grid-cols-[minmax(0,1fr)_260px]">
      <aside className="order-first min-w-0 border-b border-border px-4 lg:sticky lg:top-20 lg:order-last lg:border-b-0 lg:p-5" aria-label="公司论坛目录">
        <button type="button" aria-expanded={directoryOpen} aria-controls="community-company-directory" onClick={() => setDirectoryOpen(value => !value)} className="flex min-h-11 w-full items-center justify-between text-sm text-muted-foreground lg:hidden"><span className="inline-flex items-center gap-2"><ZaichangIcon name="company" className="size-4" />找公司</span><ChevronDown className={`size-4 transition-transform ${directoryOpen ? "rotate-180" : ""}`} aria-hidden="true" /></button>
        <div id="community-company-directory" className={directoryOpen ? "pb-4 lg:pb-0" : "hidden lg:block"}>
        <h2 className="hidden text-sm font-semibold lg:block">公司</h2>
        <label className="sr-only" htmlFor="forum-company-search">查找公司论坛</label><input id="forum-company-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="查找公司" className="my-3 min-h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-ring" />
        <div className="flex flex-col gap-1 pb-1">
          <Link href={companyHref()} className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 text-sm hover:bg-muted">全部公司</Link>
          {(expanded || search ? matching : matching.slice(0, 8)).map(c => <Link key={c.id} href={companyHref(c.id)} aria-current={companyId === c.id ? "page" : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-2 text-sm hover:bg-muted ${companyId === c.id ? "bg-primary-tint font-medium text-primary-deep" : ""}`}><CompanyLogo company={c} className="size-7 rounded-md p-1 text-xs sm:size-7" /><span>{c.shortName || c.name}</span></Link>)}
        </div>
        {catalog.isPending && <p role="status" className="py-2 text-xs text-muted-foreground">正在加载公司…</p>}
        {catalog.isError && <button type="button" className="min-h-11 text-sm underline" onClick={() => void catalog.refetch()}>重新加载公司</button>}
        {!catalog.isPending && !catalog.isError && !matching.length && <p className="py-2 text-sm text-muted-foreground">没有匹配的公司</p>}
        {!search && matching.length > 8 && <button type="button" className="mt-2 min-h-11 text-sm text-primary-deep" onClick={() => setExpanded(!expanded)}>{expanded ? "收起公司" : `查看全部 ${matching.length} 家公司`}</button>}
        <p className="mt-5 border-t border-border pt-4 text-xs leading-6 text-muted-foreground">讨论具体经历，不公开他人隐私。</p>
        </div>
      </aside>
      <div className="min-w-0 lg:border-r lg:border-border">
        {selected && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6"><div><h2 className="text-sm font-semibold">{selected.name}论坛</h2><Link className="mt-1 inline-flex min-h-11 items-center text-xs text-muted-foreground underline" href={`/company/${selected.id}`}>公司资料与评分</Link><Link className="ml-3 inline-flex min-h-11 items-center text-xs text-primary-deep" href={reviewHref}>评价这家公司</Link></div>{user ? <WebButton size="sm" variant="secondary" disabled={followingBusy || !follows.data} onClick={() => void follow()}>{follows.data?.companyIds.includes(selected.id) ? "已关注" : "关注公司"}</WebButton> : <WebButton asChild variant="secondary" size="sm"><Link href={withNext("/login", returnTo)}>关注公司</Link></WebButton>}</div>}
        {follows.isError && user && <p role="alert" className="text-sm text-destructive">关注列表暂不可用。<button type="button" onClick={() => void follows.refetch()} className="ml-2 min-h-11 underline">重试关注列表</button></p>}
        {followError && <p role="alert" className="text-sm text-destructive">{followError}</p>}
        <PostComposer companies={companies} companyId={companyId} returnTo={returnTo} />
        <div className="flex flex-wrap items-center justify-between border-b border-border px-2 sm:px-4">
          <div className="flex flex-wrap gap-1" aria-label="动态范围">{([["all", "全部动态"], ["following", "关注的公司"], ["mine", "我的发布"]] as const).map(([v, label]) => <button key={v} type="button" aria-pressed={feed === v} onClick={() => filter("feed", v === "all" ? "" : v)} className={`min-h-12 border-b-2 px-2 text-sm ${feed === v ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{label}</button>)}</div>
        </div>
        <details key={`${companyId}:${q}:${category}:${sort}`} open={Boolean(q || category || sort === "useful")} className="border-b border-border px-4 sm:px-6" data-testid="community-filters">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-xs text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"><SlidersHorizontal className="size-3.5" aria-hidden="true" />筛选{q || category || sort === "useful" ? <span className="size-1.5 rounded-full bg-primary" /> : null}</summary>
          <div className="space-y-3 pb-4">
          <ForumSearch key={q} query={q} onSearch={value => filter("q", value)} />
          <select aria-label="论坛排序" value={sort} onChange={e => filter("sort", e.target.value === "latest" ? "" : e.target.value)} className="min-h-11 rounded-lg border border-border bg-card px-3 text-sm"><option value="latest">最新发布</option><option value="useful">最多赞同</option></select>
          <div className="flex flex-wrap gap-2" aria-label="论坛话题">{[["", "全部话题"], ...Object.entries(forumCategories)].map(([v, label]) => <button type="button" key={v} aria-pressed={category === v} onClick={() => filter("category", v)} className={`min-h-11 rounded-full border px-3 text-xs ${category === v ? "border-primary bg-primary-tint text-primary-deep" : "border-border bg-card text-muted-foreground"}`}>{label}</button>)}</div>
          </div>
        </details>
        {feed !== "all" && !user && !loading ? <div className="rounded-xl border border-border bg-card p-6"><WebButton asChild variant="secondary"><Link href={withNext("/login", returnTo)}>登录后查看{feed === "mine" ? "我的发布" : "关注动态"}</Link></WebButton></div>
          : posts.isPending ? <p role="status" className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">正在加载论坛…</p>
          : posts.isError && !posts.isFetchNextPageError ? <div role="alert" className="rounded-xl border border-border bg-card p-6"><p className="text-sm">论坛暂时无法加载</p><WebButton variant="secondary" size="sm" className="mt-3" onClick={() => void posts.refetch()}>重试论坛</WebButton></div>
          : rows.length === 0 ? <div className="px-5 py-12 text-center"><ZaichangIcon name="quiet" className="mx-auto h-24 w-36 text-primary-deep" /><h2 className="mt-3 text-base font-semibold">{feed === "following" && follows.data?.companyIds.length === 0 ? "你还没有关注公司" : q || category || (!company && companyId) ? "没有符合筛选的帖子" : feed === "mine" ? "你还没有发布帖子" : feed === "following" ? "关注的公司还没有新帖子" : "还没有公开帖子"}</h2><div className="mt-4 flex flex-wrap justify-center gap-2">{q || category || (!company && companyId) ? <WebButton variant="secondary" onClick={clearFilters}>清除筛选</WebButton> : null}{feed === "following" ? <WebButton asChild variant="secondary"><Link href="/community">发现公司论坛</Link></WebButton> : <WebButton variant="secondary" onClick={compose}>发起讨论</WebButton>}</div></div>
          : rows.map(post => <ForumPostCard key={post.id} post={post} />)}
        {posts.isFetchNextPageError && <p role="alert" className="text-sm text-destructive">后续帖子加载失败，已加载内容保留。</p>}
        {posts.hasNextPage && <WebButton variant="secondary" disabled={posts.isFetchingNextPage} className="w-full" onClick={() => void posts.fetchNextPage()}>{posts.isFetchingNextPage ? "正在加载…" : posts.isFetchNextPageError ? "重试更多帖子" : "更多帖子"}</WebButton>}
      </div>
    </div>}
  </div></section>
}
function ForumSearch({ query, onSearch }: { query: string; onSearch: (value: string) => void }) {
  const [value, setValue] = useState(query)
  return <form role="search" aria-label="论坛帖子搜索" className="flex gap-2" onSubmit={event => { event.preventDefault(); onSearch(value.trim()) }}><label className="sr-only" htmlFor="forum-post-search">搜索帖子</label><input id="forum-post-search" type="search" maxLength={80} value={value} onChange={event => setValue(event.target.value)} placeholder="搜索讨论内容" className="min-h-11 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm" /><WebButton type="submit" variant="secondary">搜索</WebButton>{query ? <WebButton type="button" variant="quiet" onClick={() => onSearch("")}>清除搜索</WebButton> : null}</form>
}
function ForumPostCard({ post }: { post: ForumPost }) {
  return <article data-testid="forum-post" className="border-b border-border bg-background px-4 py-5 transition-colors hover:bg-muted/30 sm:px-6">
    <div className="flex items-start gap-3"><CompanyLogo company={{ id: post.companyId, name: post.companyName }} className="size-10 sm:size-10" /><div className="min-w-0 flex-1"><Link href={`/company/${post.companyId}/community`} className="text-sm font-semibold hover:underline">{post.companyName}</Link><p className="mt-1 text-xs text-muted-foreground">{post.authorLabel} · {new Date(post.createdAt).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" })}</p></div><span className="rounded-md bg-muted px-2 py-1 text-xs">{forumCategories[post.category]}</span></div>
    <Link href={`/community/${post.id}`} className="mt-3 block rounded-sm focus-visible:outline-2 focus-visible:outline-ring"><h2 className="break-words text-base font-semibold leading-7">{post.title}</h2><p className="mt-1 line-clamp-4 whitespace-pre-wrap break-words text-sm leading-7 text-foreground/85">{post.content}</p></Link>
    {post.status !== "visible" && <p className="mt-3 text-xs text-muted-foreground">{post.status === "pending_review" ? "等待审核" : post.status === "rejected" ? "未通过审核" : "暂不公开"} · 仅自己可见</p>}
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">{post.status === "visible" ? <ForumActions postId={post.id} usefulCount={post.usefulCount} isUseful={post.isUseful} /> : <span />}<Link href={`/community/${post.id}`} className="inline-flex min-h-11 items-center gap-1.5 text-xs text-muted-foreground hover:text-primary-deep"><ZaichangIcon name="reply" className="size-4" />{post.replyCount} 条回复</Link></div>
  </article>
}
