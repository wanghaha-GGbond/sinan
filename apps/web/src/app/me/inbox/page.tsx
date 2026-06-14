/**
 * /me/inbox — 收件箱
 *
 * 分两个区:
 *   - 消息 (dm_threads): 当前用户的 thread 列表
 *   - 请求 (dm_requests): toUser=me 且 status=pending
 *
 * Per spec: 接收方按自己节奏处理, 不产生未读红点、不推送。
 * UI 也不显示 badge 数字 — 已读/未读是用户主动进入后的状态。
 */
"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { SolidCard } from "@/components/ui/solid-card"
import { SolidButton } from "@/components/ui/solid-button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"

type Thread = {
  id: string
  otherUserId: string
  otherDisplayName: string
  otherTrustLevel: number
  lastMessageAt: string
  lastMessagePreview: string | null
  encryptionVersion: string
}

type RequestItem = {
  id: string
  fromUserId: string
  introText: string
  status: string
  createdAt: string
  rejectReason: string | null
}

export default function InboxPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [threads, setThreads] = useState<Thread[] | null>(null)
  const [requests, setRequests] = useState<RequestItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    Promise.all([
      fetch("/api/dm/threads", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/dm/requests?status=pending", { credentials: "include" }).then(
        (r) => r.json()
      ),
    ])
      .then(([t, r]) => {
        setThreads((t.threads as Thread[]) ?? [])
        setRequests((r.incoming as RequestItem[]) ?? [])
      })
      .catch(() => setError("加载失败"))
  }, [user, authLoading, router])

  const acceptReq = async (id: string) => {
    const res = await fetch(`/api/dm/requests/${id}/accept`, {
      method: "POST",
      credentials: "include",
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? "操作失败")
      return
    }
    // 刷新
    const r = await fetch("/api/dm/requests?status=pending", {
      credentials: "include",
    })
    const j = await r.json()
    setRequests(j.incoming ?? [])
    const t = await fetch("/api/dm/threads", { credentials: "include" })
    const tj = await t.json()
    setThreads(tj.threads ?? [])
    if (data.threadId) router.push(`/me/inbox/${data.threadId}`)
  }

  const rejectReq = async (id: string) => {
    const res = await fetch(`/api/dm/requests/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason: "暂不回应" }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "操作失败")
      return
    }
    const r = await fetch("/api/dm/requests?status=pending", {
      credentials: "include",
    })
    const j = await r.json()
    setRequests(j.incoming ?? [])
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          收件箱
        </h1>
        <p className="text-sm text-muted-foreground">
          消息按你打开的节奏处理, 不会推送、不会显示红点。
        </p>
      </header>

      {error && (
        <SolidCard variant="elevated" className="p-4 text-sm text-destructive">
          {error}
        </SolidCard>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">消息</h2>
        {threads === null ? (
          <SolidCard variant="elevated" className="h-20 animate-pulse" />
        ) : threads.length === 0 ? (
          <SolidCard
            variant="elevated"
            className="p-6 text-center text-sm text-muted-foreground"
          >
            还没有会话
          </SolidCard>
        ) : (
          threads.map((t) => (
            <Link
              key={t.id}
              href={`/me/inbox/${t.id}`}
              className="block transition hover:opacity-80"
            >
              <SolidCard variant="elevated" className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {t.otherDisplayName}
                      </span>
                      <Badge variant="outline">L{t.otherTrustLevel}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {t.lastMessagePreview ?? "暂无消息"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(t.lastMessageAt).toLocaleString("zh-Hans-CN", {
                      month: "numeric",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                    })}
                  </span>
                </div>
              </SolidCard>
            </Link>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">请求</h2>
          <Link
            href="/me/requests-outgoing"
            className="text-xs text-primary hover:underline"
          >
            我发起的
          </Link>
        </div>
        {requests === null ? (
          <SolidCard variant="elevated" className="h-20 animate-pulse" />
        ) : requests.length === 0 ? (
          <SolidCard
            variant="elevated"
            className="p-6 text-center text-sm text-muted-foreground"
          >
            暂无新请求
          </SolidCard>
        ) : (
          requests.map((r) => (
            <SolidCard key={r.id} variant="elevated" className="p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      来自 {r.fromUserId.slice(0, 8)}…
                    </span>
                    <Badge variant="outline">待你处理</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString("zh-Hans-CN", {
                      month: "numeric",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-sm leading-6 text-foreground/90">
                  {r.introText}
                </p>
                <div className="flex gap-2">
                  <SolidButton
                    size="sm"
                    onClick={() => acceptReq(r.id)}
                  >
                    同意
                  </SolidButton>
                  <SolidButton
                    size="sm"
                    variant="secondary"
                    onClick={() => rejectReq(r.id)}
                  >
                    暂不回应
                  </SolidButton>
                </div>
              </div>
            </SolidCard>
          ))
        )}
      </section>
    </section>
  )
}
