"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { IdentityCard, type IdentityCardData } from "@/components/identity/identity-card"
import { SolidCard } from "@/components/ui/solid-card"

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

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

      {/* Circle badge placeholders — Sprint 5-6 */}
      <SolidCard variant="default" className="p-6">
        <p className="text-sm font-semibold text-foreground">圈子 & 勋章</p>
        <p className="mt-2 text-xs text-muted-foreground">即将开放 — 认证用户可加入部门圈子并获得专属勋章。</p>
      </SolidCard>
    </section>
  )
}
