import { useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { Link, router, useLocalSearchParams } from "expo-router"

import { communityInsights, getCompany as getLocalCompany, getCompanyReviews as getLocalCompanyReviews, getReview as getLocalReview, type MobileReview } from "../../data"
import { COLORS, RADIUS } from "../../theme"
import { AppFooter, IntelNav } from "../../components/AppShellBits"
import { MobileDiscussionSection } from "../../components/MobileDiscussionSection"
import { MobileReviewCard } from "../../components/MobileReviewCard"
import { SolidButton } from "../../components/SolidButton"
import { SolidCard } from "../../components/SolidCard"
import { SolidTopbar } from "../../components/SinanPrimitives"
import { ApiError, getCompany as getRemoteCompany, getReview as getRemoteReview, type CompanyListItem, type ReviewListItem } from "../../lib/api"
import type { ReviewDiscussion } from "../../lib/storage"

type ReviewCardData = MobileReview | ReviewListItem

export default function ReviewScreen() {
  const { id, reviewId, companyId, focus } = useLocalSearchParams<{
    id: string
    reviewId?: string
    companyId?: string
    focus?: string
  }>()
  const actualReviewId = reviewId ?? id
  const localReview = getLocalReview(actualReviewId ?? "")
  const localCompany = getLocalCompany(companyId ?? (reviewId ? id : localReview.companyId))
  const isLocalFixture = actualReviewId?.startsWith("review-") ?? false
  const [remoteReview, setRemoteReview] = useState<ReviewListItem | null>(null)
  const [remoteCompany, setRemoteCompany] = useState<CompanyListItem | null>(null)
  const [loading, setLoading] = useState(!isLocalFixture)
  const [error, setError] = useState("")

  useEffect(() => {
    if (isLocalFixture || !actualReviewId) return
    let active = true
    setLoading(true)
    setError("")
    getRemoteReview(actualReviewId)
      .then(async (nextReview) => {
        const nextCompany = await getRemoteCompany(nextReview.companyId)
        if (!active) return
        setRemoteReview(nextReview)
        setRemoteCompany(nextCompany)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(cause instanceof ApiError && cause.status === 404 ? "这条评价不存在或已下架。" : "评价加载失败，请检查网络后重试。")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [actualReviewId, isLocalFixture])

  const review: ReviewCardData = remoteReview ?? localReview
  const company = remoteCompany ?? localCompany
  const isRemote = Boolean(remoteReview)
  const localCompanyReviews = getLocalCompanyReviews(localCompany.id)
  const currentIndex = localCompanyReviews.findIndex((item) => item.id === localReview.id)
  const prevReview = !isRemote && currentIndex > 0 ? localCompanyReviews[currentIndex - 1] : null
  const nextReview = !isRemote && currentIndex >= 0 && currentIndex < localCompanyReviews.length - 1 ? localCompanyReviews[currentIndex + 1] : null
  const related = !isRemote ? localCompanyReviews.filter((item) => item.id !== localReview.id).slice(0, 3) : []

  const initialDiscussions: ReviewDiscussion[] = useMemo(() => {
    if (isRemote) return []
    return communityInsights()
      .filter((item) => item.reviewId === localReview.id)
      .map((item) => ({
        id: item.id,
        reviewId: localReview.id,
        companyId: item.companyId,
        type: item.type as "追问" | "补充",
        authorLabel: item.authorLabel,
        authorRole: "anonymous",
        content: item.content,
        usefulCount: item.usefulCount,
        status: "visible",
        createdAt: new Date(Date.now() - 86_400_000 * (1 + item.usefulCount)).toISOString(),
      }))
  }, [isRemote, localReview.id])

  const [autoOpenComposer, setAutoOpenComposer] = useState(false)
  const discussionAnchorRef = useRef<View | null>(null)
  const scrollViewRef = useRef<ScrollView | null>(null)
  useEffect(() => {
    if (focus !== "discussion" || isRemote) return
    setAutoOpenComposer(true)
    const timer = setTimeout(() => {
      discussionAnchorRef.current?.measureLayout(
        scrollViewRef.current as unknown as number,
        (_x, y) => scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true }),
        () => undefined,
      )
    }, 80)
    return () => clearTimeout(timer)
  }, [focus, isRemote])

  if (loading) {
    return (
      <View style={S.container}>
        <SolidTopbar back title="评价详情" subtitle="加载中" />
        <ActivityIndicator style={S.loader} color={COLORS.primary} />
      </View>
    )
  }

  if (error && !isLocalFixture) {
    return (
      <View style={S.container}>
        <SolidTopbar back title="评价详情" subtitle="暂时不可用" />
        <View style={S.errorWrap}>
          <SolidCard variant="subtle" style={S.errorCard}>
            <Text style={S.errorTitle}>{error}</Text>
            <SolidButton title="重新加载" variant="secondary" onPress={() => router.replace(`/review/${actualReviewId}`)} />
          </SolidCard>
        </View>
      </View>
    )
  }

  const companyName = company.shortName ?? company.name
  const companyMeta = `${company.industry} · ${company.city}`
  const vibe = "vibe" in company ? company.vibe : (company.riskTags?.[0] ?? "公开评价")

  return (
    <View style={S.container}>
      <SolidTopbar back title="评价详情" subtitle={`${companyName} · ${companyMeta}`} />
      <IntelNav />
      <ScrollView ref={scrollViewRef} contentContainerStyle={S.content}>
        <View style={S.returnBar}>
          <Link href={`/company/${company.id}`} asChild>
            <TouchableOpacity accessibilityRole="link">
              <Text style={S.returnText}>‹ 返回公司评价流</Text>
            </TouchableOpacity>
          </Link>
          <Text style={S.returnMeta}>{companyName} · {"city" in company ? company.city : ""}</Text>
        </View>

        <SolidCard variant="subtle" style={S.vibeCard}>
          <Text style={S.vibeText}>这家公司当前体感标签:<Text style={S.vibeStrong}>{vibe}</Text></Text>
        </SolidCard>

        <MobileReviewCard
          review={review}
          companyId={company.id}
          expanded
          showDetailLink={false}
          showDiscussionAction={!isRemote}
          onBlocked={() => router.replace(`/company/${company.id}`)}
        />

        <SolidCard variant="subtle" style={S.helpCard}>
          <Text style={S.helpText}>这条评价已帮助 <Text style={S.helpStrong}>{review.usefulCount}</Text> 位后来者</Text>
        </SolidCard>

        {!isRemote ? (
          <View ref={discussionAnchorRef} collapsable={false}>
            <MobileDiscussionSection
              reviewId={review.id}
              companyId={company.id}
              initialDiscussions={initialDiscussions}
              autoOpenComposer={autoOpenComposer}
            />
          </View>
        ) : null}

        {!isRemote ? (
          <View style={S.navGrid}>
            {prevReview ? (
              <Link href={`/company/${company.id}/reviews/${prevReview.id}`} asChild>
                <TouchableOpacity><SolidButton title="‹ 上一条评价" variant="secondary" /></TouchableOpacity>
              </Link>
            ) : <SolidButton title="‹ 上一条评价" variant="secondary" disabled />}
            {nextReview ? (
              <Link href={`/company/${company.id}/reviews/${nextReview.id}`} asChild>
                <TouchableOpacity><SolidButton title="下一条评价 ›" variant="secondary" /></TouchableOpacity>
              </Link>
            ) : <SolidButton title="下一条评价 ›" variant="secondary" disabled />}
          </View>
        ) : null}

        {related.length > 0 ? (
          <SolidCard variant="subtle" style={S.relatedCard}>
            <Text style={S.relatedTitle}>继续看这家公司</Text>
            {related.map((item) => (
              <Link key={item.id} href={`/company/${company.id}/reviews/${item.id}`} asChild>
                <TouchableOpacity style={S.relatedItem} accessibilityRole="link">
                  <Text style={S.relatedText}>{Math.round(item.directionScore)} 分 · {item.shortComment ?? item.title}</Text>
                  <Text style={S.relatedMeta}>{item.authorRole} · 有用 {item.usefulCount}</Text>
                </TouchableOpacity>
              </Link>
            ))}
            <Link href={`/company/${company.id}`} asChild>
              <TouchableOpacity><SolidButton title="继续看这家公司" /></TouchableOpacity>
            </Link>
          </SolidCard>
        ) : null}

        <Text style={S.safety}>匿名安全提示:请勿在评价中发布姓名、联系方式、精确组织信息。司南优先保护匿名与事实表达。</Text>
        <AppFooter />
        <View style={{ height: 86 }} />
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loader: { marginTop: 72 },
  errorWrap: { padding: 16 },
  errorCard: { padding: 20, gap: 14 },
  errorTitle: { fontSize: 15, lineHeight: 22, fontWeight: "800", color: COLORS.ink },
  content: { padding: 16, gap: 14 },
  returnBar: { borderRadius: RADIUS["2xl"], backgroundColor: "rgba(247,248,242,0.9)", borderWidth: 1, borderColor: COLORS.borderSoft, padding: 12, gap: 4 },
  returnText: { fontSize: 14, fontWeight: "800", color: COLORS.primaryDark },
  returnMeta: { fontSize: 12, color: COLORS.muted },
  vibeCard: { padding: 14 },
  vibeText: { fontSize: 13, color: "#334155" },
  vibeStrong: { fontWeight: "800", color: COLORS.ink },
  helpCard: { padding: 14 },
  helpText: { fontSize: 13, color: "#475569" },
  helpStrong: { fontWeight: "800", color: "#0F172A" },
  navGrid: { gap: 10 },
  relatedCard: { padding: 16, gap: 12 },
  relatedTitle: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  relatedItem: { borderRadius: RADIUS.lg, borderWidth: 1, borderColor: "#E2E8F0", padding: 12, backgroundColor: "#FFFFFF" },
  relatedText: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  relatedMeta: { marginTop: 4, fontSize: 12, color: "#64748B" },
  safety: { fontSize: 12, lineHeight: 18, color: "#64748B" },
})
