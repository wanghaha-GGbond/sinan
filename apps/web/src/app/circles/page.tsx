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

import { SolidCard } from "@/components/ui/solid-card"
import { SolidButton } from "@/components/ui/solid-button"
import { Badge } from "@/components/ui/badge"
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
      .catch(() => setError("加载失败, 请稍后再试"))
  }, [])

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          圈层
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          入圈需要 1 名现有成员背书, 段位门槛
          {circles && circles.length > 0
            ? ` L${Math.min(...circles.map((c) => c.minTrustLevel))}+`
            : " L1+"}
          。圈层是声誉场, 不是社交场。
        </p>
      </header>

      {error && (
        <SolidCard variant="elevated" className="p-4 text-sm text-muted-foreground">
          {error}
        </SolidCard>
      )}

      {!circles && !error && (
        <SolidCard variant="elevated" className="h-32 animate-pulse" />
      )}

      {circles && circles.length === 0 && (
        <SolidCard variant="elevated" className="p-6 text-center text-sm text-muted-foreground">
          圈层即将开放, 运营在筹备首批名单。
        </SolidCard>
      )}

      {circles?.map((c) => {
        const joined = c.myMembership?.status === "active"
        return (
          <SolidCard key={c.id} variant="elevated" className="p-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {c.name}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {c.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="secondary">段位 L{c.minTrustLevel}+</Badge>
                  <span className="text-xs text-muted-foreground">
                    {c.memberCount} 位成员
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {joined ? (
                  <Badge variant="default">已加入</Badge>
                ) : (
                  <Badge variant="outline">未加入</Badge>
                )}
                <div className="ml-auto flex gap-2">
                  <SolidButton
                    size="sm"
                    variant="secondary"
                    onClick={() => router.push(`/circles/${c.id}`)}
                  >
                    查看详情
                  </SolidButton>
                  {!joined && user && (
                    <SolidButton
                      size="sm"
                      onClick={() => router.push(`/circles/${c.id}`)}
                    >
                      申请入圈
                    </SolidButton>
                  )}
                  {!user && (
                    <Link href="/login">
                      <SolidButton size="sm">登录后申请</SolidButton>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </SolidCard>
        )
      })}
    </section>
  )
}
