/**
 * /me/inbox/[threadId] — 单 thread 消息页
 */
"use client"

import Link from "next/link"
import { useEffect, useRef, useState, use } from "react"
import { useRouter } from "next/navigation"

import { SolidCard } from "@/components/ui/solid-card"
import { SolidButton } from "@/components/ui/solid-button"
import { useAuth } from "@/lib/auth-context"

type Message = {
  id: string
  threadId: string
  senderId: string
  content: string
  createdAt: string
}

export default function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  const { threadId } = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    fetch(`/api/dm/threads/${threadId}/messages`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("load_failed")
        return (await r.json()) as { messages: Message[] }
      })
      .then((j) => setMessages(j.messages ?? []))
      .catch(() => setError("加载失败"))
  }, [threadId, user, router])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = async () => {
    if (!content.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/dm/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "发送失败")
        return
      }
      setContent("")
      const r = await fetch(`/api/dm/threads/${threadId}/messages`, {
        credentials: "include",
      })
      const j = await r.json()
      setMessages(j.messages ?? [])
    } catch {
      setError("网络异常")
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <Link href="/me/inbox" className="text-sm text-primary hover:underline">
          ← 返回收件箱
        </Link>
      </div>

      <SolidCard
        variant="elevated"
        className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
      >
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            还没有消息, 说点什么吧。
          </p>
        )}
        {messages.map((m) => {
          const mine = user && m.senderId === user.id
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-6 ${
                  mine
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {m.content}
                <div className="mt-1 text-[10px] opacity-60">
                  {new Date(m.createdAt).toLocaleString("zh-Hans-CN", {
                    month: "numeric",
                    day: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                  })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </SolidCard>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <textarea
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="说点什么…"
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={sending}
        />
        <SolidButton onClick={send} disabled={!content.trim() || sending}>
          {sending ? "发送中…" : "发送"}
        </SolidButton>
      </div>
    </section>
  )
}
