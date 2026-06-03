import { useMemo, useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { Link, useLocalSearchParams } from "expo-router"
import { communityInsights, getCompany, getCompanyReviews, getReview } from "../../data"
import { COLORS, RADIUS } from "../../theme"
import { AppFooter, IntelNav } from "../../components/AppShellBits"
import { MobileReviewCard } from "../../components/MobileReviewCard"
import { SolidButton } from "../../components/SolidButton"
import { SolidCard } from "../../components/SolidCard"
import { SolidTopbar } from "../../components/SinanPrimitives"

export default function ReviewScreen() {
  const { id, reviewId, companyId } = useLocalSearchParams<{ id: string; reviewId?: string; companyId?: string }>()
  const actualReviewId = reviewId ?? id
  const review = getReview(actualReviewId ?? "")
  const company = getCompany(companyId ?? (reviewId ? id : review.companyId))
  const companyReviews = getCompanyReviews(company.id)
  const discussions = communityInsights().filter((item) => item.reviewId === review.id)
  const [sort, setSort] = useState<"useful" | "latest">("useful")
  const currentIndex = companyReviews.findIndex((item) => item.id === review.id)
  const prevReview = currentIndex > 0 ? companyReviews[currentIndex - 1] : null
  const nextReview = currentIndex >= 0 && currentIndex < companyReviews.length - 1 ? companyReviews[currentIndex + 1] : null
  const related = companyReviews.filter((item) => item.id !== review.id).slice(0, 3)

  const sortedDiscussions = useMemo(() => {
    if (sort === "latest") return [...discussions].reverse()
    return [...discussions].sort((a, b) => b.usefulCount - a.usefulCount)
  }, [discussions, sort])

  return (
    <View style={S.container}>
      <SolidTopbar back title="评价详情" subtitle={`${company.shortName} · ${company.industry} · ${company.city}`} />
      <IntelNav />
      <ScrollView contentContainerStyle={S.content}>
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
            这家公司当前体感标签：<Text style={S.vibeStrong}>{company.vibe}</Text>
          </Text>
        </SolidCard>

        <MobileReviewCard review={review} companyId={company.id} expanded showDetailLink={false} />

        <SolidCard variant="subtle" style={S.helpCard}>
          <Text style={S.helpText}>
            这条评价已帮助 <Text style={S.helpStrong}>{review.usefulCount}</Text> 位后来者
          </Text>
        </SolidCard>

        <SolidCard variant="subtle" style={S.discussionPanel}>
          <View style={S.discussionHead}>
            <Text style={S.discussionTitle}>评论 {sortedDiscussions.length}</Text>
            <View style={S.sortRow}>
              <SolidButton title="热门" size="sm" variant={sort === "useful" ? "dark" : "ghost"} onPress={() => setSort("useful")} />
              <SolidButton title="最新" size="sm" variant={sort === "latest" ? "dark" : "ghost"} onPress={() => setSort("latest")} />
            </View>
          </View>
          <View style={S.composerStub}>
            <View style={S.meAvatar}><Text style={S.meText}>我</Text></View>
            <Text style={S.composerText}>写下你的评论...</Text>
          </View>
          {sortedDiscussions.length === 0 ? (
            <Text style={S.emptyDiscussion}>还没有评论，来写第一条吧</Text>
          ) : (
            sortedDiscussions.map((discussion) => (
              <View key={discussion.id} style={S.discussionItem}>
                <Text style={S.discussionType}>{discussion.type} · {discussion.authorLabel}</Text>
                <Text style={S.discussionText}>{discussion.content}</Text>
                <Text style={S.discussionFoot}>有用 {discussion.usefulCount}</Text>
              </View>
            ))
          )}
        </SolidCard>

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
          匿名安全提示：请勿在评价中发布姓名、联系方式、精确组织信息。司南优先保护匿名与事实表达。
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
  discussionPanel: { padding: 0, overflow: "hidden" },
  discussionHead: {
    borderBottomWidth: 1, borderColor: "#EFF1F2",
    paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between", gap: 12,
  },
  discussionTitle: { fontSize: 15, fontWeight: "900", color: "#0F1419" },
  sortRow: { flexDirection: "row", gap: 4 },
  composerStub: {
    borderBottomWidth: 1, borderColor: "#EFF1F2",
    paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10,
  },
  meAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primarySoft,
    alignItems: "center", justifyContent: "center",
  },
  meText: { fontSize: 12, fontWeight: "900", color: COLORS.primaryForeground },
  composerText: { fontSize: 15, color: "#536471" },
  emptyDiscussion: { padding: 24, textAlign: "center", fontSize: 15, color: "#536471" },
  discussionItem: { borderBottomWidth: 1, borderColor: "#EFF1F2", padding: 16 },
  discussionType: { fontSize: 12, fontWeight: "800", color: COLORS.primaryDark },
  discussionText: { marginTop: 8, fontSize: 14, lineHeight: 22, color: COLORS.textSecondary },
  discussionFoot: { marginTop: 10, fontSize: 12, color: COLORS.muted },
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
