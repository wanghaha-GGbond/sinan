import { useMemo, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { Link } from "expo-router"
import { companies, reviews, type MobileCompany } from "../data"
import { COLORS, RADIUS } from "../theme"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"
import { ScoreChip, SolidTopbar, TagPill } from "../components/SinanPrimitives"

const tabs = ["高分", "高赞评价多", "最近活跃", "面试体验", "薪资讨论"] as const
type RankTab = (typeof tabs)[number]

export default function RankingsScreen() {
  const [activeTab, setActiveTab] = useState<RankTab>("高分")

  const sorted = useMemo(() => {
    const list = [...companies]
    if (activeTab === "高赞评价多") return list.sort((a, b) => b.reviewCount - a.reviewCount)
    if (activeTab === "最近活跃") return list.sort((a, b) => b.recentReviewCount - a.recentReviewCount)
    if (activeTab === "面试体验") {
      return list.sort((a, b) => interviewCount(b.id) - interviewCount(a.id))
    }
    if (activeTab === "薪资讨论") {
      return list.sort((a, b) => salaryMentionCount(b.id) - salaryMentionCount(a.id))
    }
    return list.sort((a, b) => b.directionScore - a.directionScore)
  }, [activeTab])

  return (
    <ScrollView style={S.container}>
      <SolidTopbar title="公司发现" subtitle="看看最近被更多过来人关注的公司" />
      <View style={S.tabs}>
        {tabs.map((tab) => (
          <SolidButton
            key={tab}
            title={tab}
            variant={activeTab === tab ? "dark" : "secondary"}
            size="sm"
            onPress={() => setActiveTab(tab)}
          />
        ))}
      </View>
      <View style={S.list}>
        {sorted.map((company, index) => (
          <RankingCard key={company.id} company={company} index={index} elevated={index === 0} />
        ))}
      </View>
      <View style={{ height: 88 }} />
    </ScrollView>
  )
}

function RankingCard({ company, index, elevated }: { company: MobileCompany; index: number; elevated: boolean }) {
  return (
    <Link href={`/company/${company.id}`} asChild>
      <TouchableOpacity activeOpacity={0.92}>
        <SolidCard variant={elevated ? "elevated" : "subtle"} style={S.row}>
          <View style={S.rankBubble}>
            <Text style={S.rank}>{index + 1}</Text>
          </View>
          <View style={S.companyBlock}>
            <Text style={S.name} numberOfLines={1}>{company.shortName}</Text>
            <Text style={S.meta} numberOfLines={1}>
              {company.industry} · {company.city} · {company.reviewCount} 条评价
            </Text>
            <View style={S.tags}>
              {company.riskTags.slice(0, 2).map((tag) => (
                <TagPill key={tag} tone={tag.includes("压力") || tag.includes("波动") ? "risk" : "neutral"}>
                  #{tag}
                </TagPill>
              ))}
            </View>
          </View>
          <View style={S.side}>
            <ScoreChip score={company.directionScore} compact />
            <SolidButton title="看这家公司" variant="primary" size="sm" />
          </View>
        </SolidCard>
      </TouchableOpacity>
    </Link>
  )
}

function interviewCount(companyId: string) {
  return reviews.filter((review) => review.companyId === companyId && review.employmentStatus === "面试者").length
}

function salaryMentionCount(companyId: string) {
  return reviews.filter((review) => {
    if (review.companyId !== companyId) return false
    return /薪资|调薪|奖金|兑现/.test(`${review.content}${review.shortComment ?? ""}${review.title}`)
  }).length
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 16, paddingBottom: 10 },
  list: { gap: 12, paddingHorizontal: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  rankBubble: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surfaceHover,
    alignItems: "center",
    justifyContent: "center",
  },
  rank: { fontSize: 15, fontWeight: "800", color: COLORS.inkSoft },
  companyBlock: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: "800", color: COLORS.ink },
  meta: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  side: { alignItems: "flex-end", gap: 8, flexShrink: 0 },
})
