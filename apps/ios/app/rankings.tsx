import { useMemo, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { Link } from "expo-router"
import { ArrowRight } from "lucide-react-native"

import { companies, companySnapshot, type MobileCompany } from "../data"
import { COLORS, RADIUS } from "../theme"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"
import { ScoreChip, SolidTopbar, TagPill } from "../components/SinanPrimitives"

type RankTab = "score" | "reviews" | "active" | "interview" | "salary" | "office"

const tabs: Array<{ key: RankTab; label: string; description: string }> = [
  { key: "score", label: "高分", description: "按综合方向分排序" },
  { key: "reviews", label: "高赞评价多", description: "按总评价数排序" },
  { key: "active", label: "最近活跃", description: "近 30 天新增评价多" },
  { key: "interview", label: "面试友好", description: "面试体验分 + 流程透明" },
  { key: "salary", label: "薪资透明", description: "薪资兑现分 + 样本量" },
  { key: "office", label: "办公体验好", description: "办公环境分高" },
]

type Snapshot = ReturnType<typeof companySnapshot>

export default function RankingsScreen() {
  const [activeTab, setActiveTab] = useState<RankTab>("score")

  const snapshots = useMemo(() => {
    const byCompany = new Map<string, Snapshot>()
    for (const company of companies) byCompany.set(company.id, companySnapshot(company.id))
    return companies.map((company) => ({ company, snapshot: byCompany.get(company.id)! }))
  }, [])

  const sorted = useMemo(() => {
    const list = [...snapshots]
    const signal = (item: { company: MobileCompany; snapshot: Snapshot }, tab: RankTab): number => {
      if (tab === "score") return item.company.directionScore
      if (tab === "interview") return item.snapshot.interviewScore
      if (tab === "salary") return item.snapshot.payScore
      if (tab === "office") return item.snapshot.benefits
      return 0
    }
    const count = (item: { company: MobileCompany; snapshot: Snapshot }, tab: RankTab): number => {
      if (tab === "reviews") return item.company.reviewCount
      if (tab === "active") return item.company.recentReviewCount
      if (tab === "interview") return item.snapshot.interviewCount
      if (tab === "salary") return item.snapshot.salarySamples
      return item.company.reviewCount
    }

    list.sort((a, b) => {
      if (activeTab === "score" || activeTab === "interview" || activeTab === "salary" || activeTab === "office") {
        const sa = signal(a, activeTab)
        const sb = signal(b, activeTab)
        if (sb !== sa) return sb - sa
      } else {
        const ca = count(a, activeTab)
        const cb = count(b, activeTab)
        if (cb !== ca) return cb - ca
      }
      if (b.company.directionScore !== a.company.directionScore) {
        return b.company.directionScore - a.company.directionScore
      }
      if (b.company.reviewCount !== a.company.reviewCount) {
        return b.company.reviewCount - a.company.reviewCount
      }
      return a.company.id.localeCompare(b.company.id)
    })
    return list
  }, [snapshots, activeTab])

  const activeDescription = tabs.find((t) => t.key === activeTab)?.description ?? ""

  return (
    <View style={S.container}>
      <SolidTopbar title="司南 公司发现" subtitle="看看最近被更多过来人关注的公司" back />
      <ScrollView contentContainerStyle={S.content}>
        <View style={S.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={S.heading}>公司发现</Text>
            <Text style={S.sub}>从不同角度看看最近被更多过来人关注的公司</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.tabRow}
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.key
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.85}
                onPress={() => setActiveTab(tab.key)}
                style={[S.tab, active ? S.tabActive : S.tabIdle]}
                testID={`rankings-tab-${tab.key}`}
              >
                <Text style={[S.tabText, active ? S.tabTextActive : S.tabTextIdle]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <Text style={S.activeDescription} testID="rankings-active-description">
          当前排序:{activeDescription}
        </Text>

        <View style={S.list}>
          {sorted.map(({ company, snapshot }, index) => {
            const trailing =
              activeTab === "reviews"
                ? `${company.reviewCount.toLocaleString()} 条评价`
                : activeTab === "active"
                  ? `近 30 天 +${company.recentReviewCount} 条`
                  : activeTab === "interview"
                    ? `${snapshot.interviewCount} 条面试信号`
                    : activeTab === "salary"
                      ? `${snapshot.salarySamples} 个薪资样本`
                      : activeTab === "office"
                        ? `综合 ${snapshot.benefits.toFixed(1)}`
                        : `${company.reviewCount.toLocaleString()} 条评价`

            return (
              <Link
                key={company.id}
                href={`/company/${company.id}`}
                asChild
                testID={`rankings-card-${company.id}`}
              >
                <TouchableOpacity activeOpacity={0.95}>
                  <SolidCard variant={index === 0 ? "elevated" : "subtle"} style={S.card}>
                    <View style={S.cardInner}>
                      <View style={S.rankBadge}>
                        <Text style={S.rankBadgeText}>{index + 1}</Text>
                      </View>
                      <View style={S.cardBody}>
                        <Text style={S.companyName} numberOfLines={1}>
                          {company.shortName}
                        </Text>
                        <Text style={S.companyMeta}>
                          {company.industry} · {company.city} · {trailing}
                        </Text>
                        <View style={S.tagRow}>
                          {company.riskTags.slice(0, 2).map((tag) => (
                            <TagPill
                              key={tag}
                              tone={tag.includes("压力") || tag.includes("波动") ? "risk" : "neutral"}
                            >
                              #{tag}
                            </TagPill>
                          ))}
                        </View>
                      </View>
                      <View style={S.cardRight}>
                        <ScoreChip score={company.directionScore} compact />
                        <View style={S.cta}>
                          <Text style={S.ctaText}>看这家公司</Text>
                          <ArrowRight size={12} color={COLORS.primary} />
                        </View>
                      </View>
                    </View>
                  </SolidCard>
                </TouchableOpacity>
              </Link>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  heroRow: { flexDirection: "row", alignItems: "flex-end" },
  heading: { fontSize: 24, fontWeight: "800", color: COLORS.ink },
  sub: { marginTop: 6, fontSize: 13, color: COLORS.muted },
  tabRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  tabIdle: { backgroundColor: COLORS.surfaceHover },
  tabActive: {
    backgroundColor: COLORS.dark,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
    elevation: 3,
  },
  tabText: { fontSize: 13, fontWeight: "800" },
  tabTextIdle: { color: COLORS.inkSoft },
  tabTextActive: { color: "#FFFFFF" },
  activeDescription: { fontSize: 12, color: COLORS.muted },
  list: { gap: 12 },
  card: { padding: 14 },
  cardInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceHover,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeText: { fontSize: 14, fontWeight: "800", color: COLORS.inkSoft },
  cardBody: { flex: 1, minWidth: 0, gap: 4 },
  companyName: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  companyMeta: { fontSize: 12, color: COLORS.muted },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  cardRight: { alignItems: "flex-end", gap: 8 },
  cta: { flexDirection: "row", alignItems: "center", gap: 4 },
  ctaText: { fontSize: 12, fontWeight: "800", color: COLORS.primaryDark },
})
