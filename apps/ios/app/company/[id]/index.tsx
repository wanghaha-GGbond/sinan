import { View, Text, StyleSheet, ScrollView } from "react-native"
import { Link, useLocalSearchParams } from "expo-router"
import { getCompany, getCompanyReviews } from "../../../data"
import { COLORS, RADIUS } from "../../../theme"
import { CompanyIntelligencePanel } from "../../../components/CompanyIntelligencePanel"
import { CompanyReviewFeed } from "../../../components/CompanyReviewFeed"
import { AppFooter, IntelNav } from "../../../components/AppShellBits"
import { SolidButton } from "../../../components/SolidButton"
import { SolidCard } from "../../../components/SolidCard"
import { SolidTopbar, TagPill } from "../../../components/SinanPrimitives"

export default function CompanyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const company = getCompany(id ?? "")
  const reviews = getCompanyReviews(company.id)

  return (
    <View style={S.container}>
      <SolidTopbar title="司南" subtitle="公司详情" back />
      <IntelNav />
      <ScrollView contentContainerStyle={S.content}>
        <View style={S.stickyHeader}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={S.stickyTitle} numberOfLines={1}>{company.name}</Text>
            <Text style={S.stickyMeta} numberOfLines={1}>
              {company.industry} · {company.city} · 方向分 {company.directionScore.toFixed(1)} · {reviews.length} 条评价
            </Text>
            <Text style={S.vibeLine} numberOfLines={1}>公司体感：{company.vibe}</Text>
          </View>
          <Link href="/submit" asChild>
            <SolidButton title="匿名评价" size="sm" />
          </Link>
        </View>

        <View style={S.summaryStrip}>
          <Text style={S.summaryText}>方向分 {company.directionScore.toFixed(1)}</Text>
          <Text style={S.summaryDivider}>｜</Text>
          <Text style={S.summaryText}>推荐入职率 {company.recommendationRate}%</Text>
          <Text style={S.summaryDivider}>｜</Text>
          <Text style={S.summaryText}>{reviews.length} 条评价</Text>
          <Text style={S.summaryDivider}>｜</Text>
          <Text style={S.summaryText}>公司体感 {company.vibe}</Text>
          <Text style={S.summaryDivider}>｜</Text>
          <Text style={S.summaryText}>办公体验 {company.officeScore.toFixed(1)}</Text>
          {company.riskTags.slice(0, 2).map((tag) => (
            <TagPill key={tag} tone="risk">#{tag}</TagPill>
          ))}
        </View>

        <View style={S.companyActions}>
          <Link href={`/company/${company.id}/reviews`} asChild>
            <SolidButton title="看全部评价" variant="secondary" size="sm" />
          </Link>
          <Link href={`/company/${company.id}/ratings`} asChild>
            <SolidButton title="评分详情" variant="secondary" size="sm" />
          </Link>
        </View>

        <CompanyIntelligencePanel company={company} />

        {reviews.length === 0 ? (
          <SolidCard variant="subtle" style={S.emptyCard}>
            <Text style={S.emptyTitle}>这家公司还没有评价。</Text>
            <Text style={S.emptyDesc}>成为第一个补上这段经历的人。</Text>
          </SolidCard>
        ) : (
          <CompanyReviewFeed companyId={company.id} reviews={reviews} />
        )}

        <View style={{ height: 80 }} />
        <AppFooter />
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingVertical: 16, gap: 16 },
  stickyHeader: {
    borderRadius: RADIUS["3xl"], borderWidth: 1, borderColor: "rgba(229,231,219,0.7)",
    backgroundColor: "rgba(247,248,242,0.9)", paddingHorizontal: 16, paddingVertical: 13,
    flexDirection: "row", alignItems: "center", gap: 12,
    shadowColor: "#111827", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 24,
  },
  stickyTitle: { fontSize: 17, fontWeight: "800", color: COLORS.ink },
  stickyMeta: { marginTop: 4, fontSize: 12, color: COLORS.muted },
  vibeLine: { marginTop: 3, fontSize: 12, color: COLORS.muted },
  summaryStrip: {
    borderRadius: RADIUS["2xl"], backgroundColor: COLORS.surfaceHover,
    paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", flexWrap: "wrap",
    alignItems: "center", gap: 6,
  },
  summaryText: { fontSize: 12, color: COLORS.muted },
  summaryDivider: { fontSize: 12, color: COLORS.muted },
  companyActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emptyCard: { padding: 18 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  emptyDesc: { marginTop: 6, fontSize: 13, color: COLORS.muted },
})
