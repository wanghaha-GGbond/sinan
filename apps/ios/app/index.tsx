import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { Link } from "expo-router"
import { companies } from "../data"
import { COLORS, RADIUS } from "../theme"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"
import { AppFooter, HomeHeaderActions, IntelNav } from "../components/AppShellBits"
import { MetricPill, ScoreChip, SolidTopbar, TagPill } from "../components/SinanPrimitives"

const userPreference = {
  quickPrefs: ["AI 工具", "企业协作", "上海"],
  extraCount: 2,
}

export default function HomeScreen() {
  return (
    <View style={S.container}>
      <SolidTopbar title="司南 推荐" subtitle="最近被关注" right={<HomeHeaderActions />} />
      <IntelNav />
      <ScrollView contentContainerStyle={S.content}>
        <View style={S.hero}>
          <View style={S.heroTop}>
            <View>
              <Text style={S.heroTitle}>推荐</Text>
              <Text style={S.heroSubtitle}>最近被关注</Text>
            </View>
            <Text style={S.routeIcon}>路线</Text>
          </View>
          <Text style={S.preference}>
            你的方向：{userPreference.quickPrefs.join(" / ")} +{userPreference.extraCount}
          </Text>
        </View>

        <View style={S.cardList}>
          {companies.map((company) => (
            <Link key={company.id} href={`/company/${company.id}`} asChild>
              <TouchableOpacity activeOpacity={0.95}>
                <SolidCard variant="default" style={S.companyCard}>
                  <View style={S.cardStack}>
                    <View style={S.cardTopLine}>
                      <TagPill tone="match">{company.highlights[0] ?? company.vibe}</TagPill>
                      <Text style={S.matchText}>匹配：{company.roles.slice(0, 2).join(" / ")}</Text>
                    </View>

                    <View style={S.companyHead}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={S.companyName} numberOfLines={1}>{company.name}</Text>
                        <Text style={S.companyMeta}>{company.industry} · {company.city} · {company.size}</Text>
                      </View>
                      <ScoreChip score={company.directionScore} />
                    </View>

                    <Text style={S.reviewCount}>{company.reviewCount.toLocaleString()} 条评价 · {company.recommendationRate}% 推荐</Text>

                    <View style={S.metricGrid}>
                      <MetricPill label="推荐入职率" value={`${company.recommendationRate}%`} />
                      <MetricPill label="薪资区间" value={company.salaryRange} />
                      <MetricPill label="办公体验" value={company.officeScore.toFixed(1)} />
                    </View>

                    <TagPill tone="neutral">公司体感：{company.vibe}</TagPill>
                    <Text style={S.vibeSummary}>{company.highlights.join(" / ")}</Text>
                    <Text style={S.officeText}>办公体验 {company.officeScore.toFixed(1)}</Text>

                    <View style={S.cardBottom}>
                      <Text style={S.recent}>近 7 天新增 {company.recentReviewCount} 条评价</Text>
                      <SolidButton title="看这家公司" variant="primary" size="sm" />
                    </View>
                  </View>
                </SolidCard>
              </TouchableOpacity>
            </Link>
          ))}
        </View>

        <View style={S.footerHint}>
          <Text style={S.footerHintText}>继续下滑，看更多过来人评价。</Text>
        </View>
        <AppFooter />
        <View style={{ height: 76 }} />
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingVertical: 16 },
  hero: {
    marginBottom: 16, borderRadius: RADIUS["3xl"], backgroundColor: COLORS.surfaceHover,
    paddingHorizontal: 16, paddingVertical: 13,
    shadowColor: "#111827", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.03, shadowRadius: 0,
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  heroTitle: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  heroSubtitle: { marginTop: 2, fontSize: 14, color: COLORS.muted },
  routeIcon: { fontSize: 12, fontWeight: "900", color: COLORS.primary },
  preference: {
    marginTop: 10, alignSelf: "flex-start", borderRadius: 999, overflow: "hidden",
    backgroundColor: COLORS.primarySoft, paddingHorizontal: 10, paddingVertical: 5,
    fontSize: 12, color: COLORS.primaryForeground,
  },
  cardList: { gap: 16 },
  companyCard: { padding: 20 },
  cardStack: { gap: 15 },
  cardTopLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  matchText: { fontSize: 12, color: COLORS.muted },
  companyHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  companyName: { fontSize: 18, lineHeight: 24, fontWeight: "800", color: COLORS.ink },
  companyMeta: { marginTop: 5, fontSize: 14, color: COLORS.muted },
  reviewCount: { fontSize: 12, color: COLORS.muted },
  metricGrid: { gap: 8 },
  vibeSummary: { fontSize: 12, lineHeight: 18, color: COLORS.muted },
  officeText: { fontSize: 12, color: COLORS.muted },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  recent: { flex: 1, fontSize: 13, color: COLORS.muted },
  footerHint: { marginTop: 16, borderRadius: RADIUS["2xl"], backgroundColor: COLORS.surfaceHover, padding: 14 },
  footerHintText: { color: COLORS.muted, fontSize: 13 },
})
