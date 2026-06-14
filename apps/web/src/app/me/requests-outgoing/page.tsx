/**
 * /me/requests-outgoing — 我发出的请求 (含已发出但 toUser 未处理)
 */
"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { SolidCard } from "@/components/ui/solid-card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"

type OutgoingRequest = {
  id: string
  toUserId: string
  introText: string
  status: string
  createdAt: string
  actionedAt: string | null
  rejectReason: string | null
}

const statusLabel: Record<string, string> = {
  pending: "等待对方处理",
  accepted: "已通过",
  rejected: "被婉拒",
  withdrawn: "已撤回",
}

export default function RequestsOutgoingPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [outgoing, setOutgoing] = useState<OutgoingRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    fetch("/api/dm/requests", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => setOutgoing((j.outgoing as OutgoingRequest[]) ?? []))
      .catch(() => setError("加载失败"))
  }, [user, authLoading, router])

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          我发起的请求
        </h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/me/inbox" className="underline">
            返回收件箱
          </Link>
        </p>
      </header>

      {error && (
        <SolidCard variant="elevated" className="p-4 text-sm text-destructive">
          {error}
        </SolidCard>
      )}

      {outgoing === null ? (
        <SolidCard variant="elevated" className="h-20 animate-pulse" />
      ) : outgoing.length === 0 ? (
        <SolidCard
          variant="elevated"
          className="p-6 text-center text-sm text-muted-foreground"
        >
          你还没有发起过私信请求
        </SolidCard>
      ) : (
        outgoing.map((r) => (
          <SolidCard key={r.id} variant="elevated" className="p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    发送给 {r.toUserId.slice(0, 8)}…
                  </span>
                  <Badge
                    variant={
                      r.status === "accepted"
                        ? "default"
                        : r.status === "rejected"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {statusLabel[r.status] ?? r.status}
                  </Badge>
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
              {r.rejectReason && (
                <p className="text-xs text-muted-foreground">
                  对方理由: {r.rejectReason}
                </p>
              )}
            </div>
          </SolidCard>
        ))
      )}
    </section>
  )
}
