"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Award, Mail } from "lucide-react"
import { IdentityCard, type IdentityCardData } from "@/components/identity/identity-card"
import { SolidCard } from "@/components/ui/solid-card"
import { useAuth } from "@/lib/auth-context"
import { SolidButton } from "@/components/ui/solid-button"

type ProfileData = {
  id: string
  displayName: string | null
  trustLevel: number
  reputationScore: number
  jobBand: string | null
  yearsOfExperience: number | null
  highlightMoment: string | null
  declinedOffer: string | null
  companyName: string | null
  inviterName: string | null
  createdAt: string
}

type UserCircle = {
  circleId: string
  circleName: string
  circleSlug: string
  minTrustLevel: number
  joinedAt: string
}

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [userCircles, setUserCircles] = useState<UserCircle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dmError, setDmError] = useState<string | null>(null)
  const [dmIntro, setDmIntro] = useState("")
  const [dmSending, setDmSending] = useState(false)

  useEffect(() => {
    if (!id) return

    fetch(`/api/users/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("not_found")
        return res.json() as Promise<ProfileData>
      })
      .then((data) => {
        setProfile(data)
        setLoading(false)
      })
      .catch(() => {
        setError("找不到该用户")
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    if (!id) return
    fetch(`/api/users/${id}/circles`, { credentials: "include" })
      .then(async (r) =>
        r.ok ? ((await r.json()) as { circles: UserCircle[] }) : { circles: [] }
      )
      .then((j) => setUserCircles(j.circles ?? []))
      .catch(() => setUserCircles([]))
  }, [id])

  const startDm = async (introText: string) => {
    if (!currentUser) {
      window.location.href = "/login"
      return
    }
    setDmSending(true)
    setDmError(null)
    try {
      const res = await fetch(`/api/dm/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ toUserId: id, introText }),
      })
      const data = await res.json()
      if (!res.ok) {
        setDmError(data.error ?? "私信失败")
        return
      }
      if (data.kind === "thread") {
        window.location.href = `/me/inbox/${data.threadId}`
      } else {
        // request queued
        setDmError("已发送请求, 等待对方回应")
      }
    } catch {
      setDmError("网络异常")
    } finally {
      setDmSending(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 px-4 py-16">
        <div className="h-48 w-80 animate-pulse rounded-2xl bg-muted" />
        <div className="h-24 w-full animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-16 text-center">
        <p className="text-muted-foreground">{error ?? "用户不存在"}</p>
        <Link href="/" className="text-sm font-medium text-primary hover:underline">
          返回首页
        </Link>
      </div>
    )
  }

  const cardData: IdentityCardData = {
    displayName: profile.displayName ?? "匿名用户",
    trustLevel: profile.trustLevel,
    companyName: profile.companyName ?? undefined,
    jobBand: profile.jobBand ?? undefined,
    yearsOfExperience: profile.yearsOfExperience ?? undefined,
    highlightMoment: profile.highlightMoment ?? undefined,
    declinedOffer: profile.declinedOffer ?? undefined,
    reputationScore: profile.reputationScore,
    inviterName: profile.inviterName ?? undefined,
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        返回
      </Link>

      {/* Card — centrepiece */}
      <div className="flex justify-center">
        <IdentityCard data={cardData} />
      </div>

      <p className="text-center text-xs text-muted-foreground">点击卡片查看背面声誉数据</p>

      {/* Profile meta */}
      <SolidCard variant="default" className="p-6">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">认证等级</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">
              {profile.trustLevel === 0
                ? "未认证"
                : profile.trustLevel === 1
                ? "企业认证"
                : profile.trustLevel === 2
                ? "深度认证"
                : "顶级认证"}
            </dd>
          </div>

          {profile.companyName && (
            <div>
              <dt className="text-xs text-muted-foreground">就职公司</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">{profile.companyName}</dd>
            </div>
          )}

          {profile.yearsOfExperience != null && (
            <div>
              <dt className="text-xs text-muted-foreground">工作年限</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">{profile.yearsOfExperience} 年</dd>
            </div>
          )}

          <div>
            <dt className="text-xs text-muted-foreground">声誉分</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">{profile.reputationScore}</dd>
          </div>

          <div>
            <dt className="text-xs text-muted-foreground">加入时间</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">
              {new Date(profile.createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long" })}
            </dd>
          </div>

          {profile.inviterName && (
            <div>
              <dt className="text-xs text-muted-foreground">由谁引荐</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">{profile.inviterName}</dd>
            </div>
          )}
        </dl>
      </SolidCard>

      {/* DM button — M3 */}
      {currentUser && currentUser.id !== profile.id && (
        <SolidCard variant="default" className="p-6">
          <p className="text-sm font-semibold text-foreground">私信</p>
          {Math.abs((currentUser.trustLevel ?? 0) - profile.trustLevel) >= 2 ? (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                段位差 ≥ 2, 需要 140 字自我介绍。
              </p>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                rows={3}
                maxLength={140}
                placeholder="我是谁, 为什么想联系你 (140 字内)"
                value={dmIntro}
                onChange={(e) => setDmIntro(e.target.value.slice(0, 140))}
                disabled={dmSending}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {dmIntro.length}/140
                </span>
                <SolidButton
                  size="sm"
                  onClick={() => startDm(dmIntro)}
                  disabled={dmSending || dmIntro.trim().length === 0}
                >
                  {dmSending ? "发送中…" : "发送请求"}
                </SolidButton>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <SolidButton size="sm" onClick={() => startDm("")}>
                <Mail className="mr-1 size-3" />
                发起私信
              </SolidButton>
            </div>
          )}
          {dmError && (
            <p className="mt-2 text-sm text-muted-foreground">{dmError}</p>
          )}
        </SolidCard>
      )}

      {/* Circle badges — M3 */}
      <SolidCard variant="default" className="p-6">
        <p className="text-sm font-semibold text-foreground">所在圈层</p>
        {userCircles.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            暂未加入任何圈层
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {userCircles.map((c) => (
              <Link
                key={c.circleId}
                href={`/circles/${c.circleId}`}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/10"
              >
                <Award className="size-3" />
                {c.circleName}
                <span className="opacity-60">·L{c.minTrustLevel}+</span>
              </Link>
            ))}
          </div>
        )}
      </SolidCard>
    </section>
  )
}
