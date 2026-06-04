import { useEffect, useMemo, useRef, useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { Link, useLocalSearchParams } from "expo-router"
import { communityInsights, getCompany, getCompanyReviews, getReview } from "../../data"
import { COLORS, RADIUS } from "../../theme"
import { AppFooter, IntelNav } from "../../components/AppShellBits"
import { MobileDiscussionSection } from "../../components/MobileDiscussionSection"
import { MobileReviewCard } from "../../components/MobileReviewCard"
import { SolidButton } from "../../components/SolidButton"
import { SolidCard } from "../../components/SolidCard"
import { SolidTopbar } from "../../components/SinanPrimitives"
import type { ReviewDiscussion } from "../../lib/storage"

export default function ReviewScreen() {
  const { id, reviewId, companyId, focus } = useLocalSearchParams<{
    id: string
    reviewId?: string
    companyId?: string
    focus?: string
  }>()
  const actualReviewId = reviewId ?? id
  const review = getReview(actualReviewId ?? "")
  const company = getCompany(companyId ?? (reviewId ? id : review.companyId))
  const companyReviews = getCompanyReviews(company.id)

  // Normalize the iOS data shape into the canonical ReviewDiscussion type
  // the new MobileDiscussionSection expects. Mobile's data layer uses
  // 中文 type ("追问" / "补充") and 中文 authorLabel, so we mostly
  // pass through.
  const initialDiscussions: ReviewDiscussion[] = useMemo(() => {
    return communityInsights()
      .filter((item) => item.reviewId === review.id)
      .map((item) => ({
        id: item.id,
        reviewId: review.id,
        companyId: item.companyId,
        type: item.type as "追问" | "补充",
        authorLabel: item.authorLabel,
        authorRole: "anonymous",
        content: item.content,
        usefulCount: item.usefulCount,
        status: "visible",
        createdAt: new Date(Date.now() - 86_400_000 * (1 + item.usefulCount)).toISOString(),
      }))
  }, [review.id])

  const currentIndex = companyReviews.findIndex((item) => item.id === review.id)
  const prevReview = currentIndex > 0 ? companyReviews[currentIndex - 1] : null
  const nextReview = currentIndex >= 0 && currentIndex < companyReviews.length - 1 ? companyReviews[currentIndex + 1] : null
  const related = companyReviews.filter((item) => item.id !== review.id).slice(0, 3)

  // Auto-scroll + open composer when arrived via "回复 N" deep link.
  const [autoOpenComposer, setAutoOpenComposer] = useState(false)
  const discussionAnchorRef = useRef<View | null>(null)
  const scrollViewRef = useRef<ScrollView | null>(null)
  useEffect(() => {
    if (focus !== "discussion") return
    setAutoOpenComposer(true)
    // Wait one frame for layout, then scroll the discussion anchor into view.
    const t = setTimeout(() => {
      discussionAnchorRef.current?.measureLayout(
        scrollViewRef.current as unknown as number,
        (_x, y) => {
          scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true })
        },
        () => undefined
      )
    }, 80)
    return () => clearTimeout(t)
  }, [focus])

  return (
    <View style={S.container}>
      <SolidTopbar back title="评价详情" subtitle={`${company.shortName} · ${company.industry} · ${company.city}`} />
      <IntelNav />
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={S.content}
      >
        <View style={S.returnBar}>
          <Link href={`/company/${company.id}`} asChild>
            <TouchableOpacity>
              <Text style={S.returnText}>‹ 返回公司评价流</Text>
            </TouchableOpacity>
          </Link>
          <Text style={S.returnMeta}>{company.shortName} · {company.city}</Text>
        </View>

        <SolidCard variant="subtle" style={S.vibeCard}>
          <Text style={S.vibeText}>
            这家公司当前体感标签:<Text style={S.vibeStrong}>{company.vibe}</Text>
          </Text>
        </SolidCard>

        <MobileReviewCard review={review} companyId={company.id} expanded showDetailLink={false} />

        <SolidCard variant="subtle" style={S.helpCard}>
          <Text style={S.helpText}>
            这条评价已帮助 <Text style={S.helpStrong}>{review.usefulCount}</Text> 位后来者
          </Text>
        </SolidCard>

        <View ref={discussionAnchorRef} collapsable={false}>
          <MobileDiscussionSection
            reviewId={review.id}
            companyId={company.id}
            initialDiscussions={initialDiscussions}
            autoOpenComposer={autoOpenComposer}
          />
        </View>

        <View style={S.navGrid}>
          {prevReview ? (
            <Link href={`/company/${company.id}/reviews/${prevReview.id}`} asChild>
              <TouchableOpacity><SolidButton title="‹ 上一条评价" variant="secondary" /></TouchableOpacity>
            </Link>
          ) : (
            <SolidButton title="‹ 上一条评价" variant="secondary" disabled />
          )}
          {nextReview ? (
            <Link href={`/company/${company.id}/reviews/${nextReview.id}`} asChild>
              <TouchableOpacity><SolidButton title="下一条评价 ›" variant="secondary" /></TouchableOpacity>
            </Link>
          ) : (
            <SolidButton title="下一条评价 ›" variant="secondary" disabled />
          )}
        </View>

        <SolidCard variant="subtle" style={S.relatedCard}>
          <Text style={S.relatedTitle}>继续看这家公司</Text>
          {related.map((item) => (
            <Link key={item.id} href={`/company/${company.id}/reviews/${item.id}`} asChild>
              <TouchableOpacity style={S.relatedItem}>
                <Text style={S.relatedText}>{Math.round(item.directionScore)} 分 · {item.shortComment ?? item.title}</Text>
                <Text style={S.relatedMeta}>{item.authorRole} · 有用 {item.usefulCount}</Text>
              </TouchableOpacity>
            </Link>
          ))}
          <Link href={`/company/${company.id}`} asChild>
            <TouchableOpacity><SolidButton title="继续看这家公司" /></TouchableOpacity>
          </Link>
        </SolidCard>

        <Text style={S.safety}>
          匿名安全提示:请勿在评价中发布姓名、联系方式、精确组织信息。司南优先保护匿名与事实表达。
        </Text>
        <AppFooter />
        <View style={{ height: 86 }} />
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, gap: 14 },
  returnBar: {
    borderRadius: RADIUS["2xl"], backgroundColor: "rgba(247,248,242,0.9)",
    borderWidth: 1, borderColor: COLORS.borderSoft, padding: 12, gap: 4,
  },
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
  relatedItem: {
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: "#E2E8F0",
    padding: 12, backgroundColor: "#FFFFFF",
  },
  relatedText: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  relatedMeta: { marginTop: 4, fontSize: 12, color: "#64748B" },
  safety: { fontSize: 12, lineHeight: 18, color: "#64748B" },
})
