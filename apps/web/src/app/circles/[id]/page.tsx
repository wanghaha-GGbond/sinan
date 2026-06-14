/**
 * /circles/[id] — 圈层详情页
 *
 * - 成员列表: 匿名化, 只显示段位 + 职级(模糊) + 加入时间
 * - "申请入圈"按钮: 已 active 成员才能背书(可从下拉选自己作为背书人,
 *   或在已是 active 成员后对新人申请"背书")。
 *
 * 简化 v1: 申请时弹出"输入背书人 userId"的提示, 实际 UI 是一段说明 +
 * 一个输入框。完整的「我点了申请, 弹出现有成员让我勾选」流程在 v1.1。
 */
"use client"

import Link from "next/link"
import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"

import { SolidCard } from "@/components/ui/solid-card"
import { SolidButton } from "@/components/ui/solid-button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"

type CircleDetail = {
  id: string
  name: string
  slug: string
  description: string
  minTrustLevel: number
  memberCount: number
  myMembership: { id: string; status: string } | null
}

type Member = {
  id: string
  joinedAt: string
  trustLevel: number
  jobBandLabel: string
}

export default function CircleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [circle, setCircle] = useState<CircleDetail | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [endorserId, setEndorserId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/circles`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/circles/${id}/members`, { credentials: "include" }).then(
        (r) => r.json()
      ),
    ])
      .then(([circlesRes, membersRes]) => {
        const found = (circlesRes.circles as CircleDetail[]).find(
          (c) => c.id === id
        )
        setCircle(found ?? null)
        setMembers((membersRes.members as Member[]) ?? [])
        setLoading(false)
      })
      .catch(() => {
        setError("加载失败")
        setLoading(false)
      })
  }, [id])

  const handleJoin = async () => {
    if (!user) {
      router.push("/login")
      return
    }
    if (!endorserId.trim()) {
      setError("请输入背书人 userId")
      return
    }
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/circles/${id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ endorsedByUserId: endorserId.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "申请失败")
        return
      }
      setSuccess("入圈成功")
      // 刷新成员
      const r = await fetch(`/api/circles/${id}/members`, {
        credentials: "include",
      })
      const j = await r.json()
      setMembers(j.members ?? [])
    } catch {
      setError("网络异常")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <SolidCard variant="elevated" className="h-40 animate-pulse" />
      </section>
    )
  }
  if (!circle) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <SolidCard variant="elevated" className="p-6 text-center text-sm text-muted-foreground">
          圈层不存在
        </SolidCard>
      </section>
    )
  }

  const joined = circle.myMembership?.status === "active"

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <SolidCard variant="elevated" className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {circle.name}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {circle.description}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="secondary">段位 L{circle.minTrustLevel}+</Badge>
            <span className="text-xs text-muted-foreground">
              {circle.memberCount} 位成员
            </span>
          </div>
        </div>
        {joined && (
          <div className="mt-4">
            <Badge variant="default">你已加入</Badge>
          </div>
        )}
      </SolidCard>

      {!joined && (
        <SolidCard variant="elevated" className="p-5">
          <h2 className="text-base font-semibold text-foreground">申请入圈</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            找到圈内 1 名成员, 请 TA 在私信里给你 userId, 然后填写下方提交。
            {circle.minTrustLevel >= 2
              ? " 总监圈需要 L2+ 背书, 这是 L2 段的稀缺性。"
              : ""}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="背书人 userId"
              value={endorserId}
              onChange={(e) => setEndorserId(e.target.value)}
              disabled={!user || submitting}
            />
            <SolidButton
              onClick={handleJoin}
              disabled={!user || submitting}
              size="md"
            >
              {submitting ? "提交中…" : "提交背书申请"}
            </SolidButton>
          </div>
          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
          {success && (
            <p className="mt-2 text-sm text-primary">{success}</p>
          )}
          {!user && (
            <p className="mt-2 text-sm text-muted-foreground">
              <Link href="/login" className="underline">
                登录
              </Link>
              {" "}后即可申请
            </p>
          )}
        </SolidCard>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          圈内成员 (匿名)
        </h2>
        {members.length === 0 ? (
          <SolidCard variant="elevated" className="p-6 text-center text-sm text-muted-foreground">
            还没有成员
          </SolidCard>
        ) : (
          members.map((m) => (
            <SolidCard key={m.id} variant="elevated" className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{m.jobBandLabel}</Badge>
                  <span className="text-sm font-medium text-foreground">
                    L{m.trustLevel} 段位
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  加入于 {new Date(m.joinedAt).toLocaleDateString("zh-Hans-CN")}
                </span>
              </div>
            </SolidCard>
          ))
        )}
      </div>
    </section>
  )
}
