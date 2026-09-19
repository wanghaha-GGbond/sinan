/**
 * /circles — 圈层列表页
 *
 * Per docs/04-spec-f3-growth.md §2:
 *   - 首批 3 圈: 总监圈 / 出海圈 / 大模型圈
 *   - 显示 minTrustLevel + 当前用户的加入状态
 *   - 匿名访问也能看 (只是看不到 myMembership)
 */
"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { WebSurface } from "@/components/ui/web-surface"
import { WebButton } from "@/components/ui/web-button"
import { useAuth } from "@/lib/auth-context"

type CircleItem = {
  id: string
  name: string
  slug: string
  description: string
  minTrustLevel: number
  status: string
  memberCount: number
  myMembership: { id: string; status: string; joinedAt: string } | null
}

export default function CirclesListPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [circles, setCircles] = useState<CircleItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/circles", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("load_failed")
        return (await r.json()) as { circles: CircleItem[] }
      })
      .then((data) => setCircles(data.circles))
      .catch(() => setError("加载失败，请稍后再试"))
  }, [])

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">圈层</h1>
          <p className="mt-1 text-sm text-muted-foreground">声誉场，不是社交场。</p>
        </div>
      </div>

      {error && (
        <WebSurface variant="subtle" className="p-4 text-sm text-muted-foreground">
          {error}
        </WebSurface>
      )}

      {!circles && !error && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-[28px] bg-muted" />
          ))}
        </div>
      )}

      {circles && circles.length === 0 && (
        <WebSurface variant="subtle" className="p-6 text-center text-sm text-muted-foreground">
          圈层即将开放，运营在筹备首批名单。
        </WebSurface>
      )}

      {circles?.map((c) => {
        const joined = c.myMembership?.status === "active"
        return (
          <WebSurface
            key={c.id}
            variant="default"
            className={`p-5 ${joined ? "border-t-2 border-t-primary" : ""}`}
          >
            {/* Name + badge row */}
            <div className="mb-2.5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold tracking-tight text-foreground">{c.name}</h2>
                {joined && (
                  <span className="text-xs font-semibold text-primary">已加入</span>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="mb-1 inline-block rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-semibold text-background">
                  L{c.minTrustLevel}+
                </div>
                <div className="text-[11px] text-muted-foreground">{c.memberCount} 人</div>
              </div>
            </div>

            {/* Description */}
            <p className="mb-4 text-sm leading-6 text-muted-foreground">{c.description}</p>

            {/* Footer row */}
            <div className="flex items-center gap-3 border-t border-border/60 pt-4">
              {!joined && (
                <span className="flex-1 text-xs text-muted-foreground">需 1 名成员背书</span>
              )}
              {joined ? (
                <WebButton
                  size="sm"
                  variant="secondary"
                  className="ml-auto"
                  onClick={() => router.push(`/circles/${c.id}`)}
                >
                  进入圈子
                </WebButton>
              ) : user ? (
                <WebButton
                  size="sm"
                  variant="dark"
                  className="ml-auto"
                  onClick={() => router.push(`/circles/${c.id}`)}
                >
                  申请入圈
                </WebButton>
              ) : (
                <Link href="/login" className="ml-auto">
                  <WebButton size="sm" variant="dark">登录后申请</WebButton>
                </Link>
              )}
            </div>
          </WebSurface>
        )
      })}
    </section>
  )
}
