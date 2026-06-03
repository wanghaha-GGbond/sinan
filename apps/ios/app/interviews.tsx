import { useMemo, useState } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { router } from "expo-router"

import { MobileFilterBar } from "../components/MobileFilterBar"
import { AppFooter, IntelNav } from "../components/AppShellBits"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"
import { ScoreChip, SolidTopbar, TagPill } from "../components/SinanPrimitives"
import { companies, interviewInsights } from "../data"
import { COLORS } from "../theme"

type SortKey = "score" | "samples" | "company"
const SORT_OPTIONS = [
  { value: "score", label: "体验分高" },
  { value: "samples", label: "样本多" },
  { value: "company", label: "公司名 A-Z" },
] as const

export default function InterviewsScreen() {
  const [industry, setIndustry] = useState<string>("all")
  const [city, setCity] = useState<string>("all")
  const [sort, setSort] = useState<SortKey>("score")

  const all = useMemo(() => interviewInsights(), [])

  const industries = useMemo(
    () => Array.from(new Set(companies.map((c) => c.industry))).sort(),
    []
  )
  const cities = useMemo(
    () => Array.from(new Set(companies.map((c) => c.city))).sort(),
    []
  )

  const filtered = useMemo(() => {
    const matched = all.filter((item) => {
      if (industry !== "all" && item.company.industry !== industry) return false
      if (city !== "all" && item.company.city !== city) return false
      return true
    })
    matched.sort((a, b) => {
      if (sort === "score") return b.score - a.score
      if (sort === "samples") return (b.company.reviewCount - a.company.reviewCount)
      return a.company.shortName.localeCompare(b.company.shortName, "zh")
    })
    return matched
  }, [all, industry, city, sort])

  return (
    <View style={S.container}>
      <SolidTopbar back title="面试情报" subtitle="流程 · 轮次 · 真实体验" />
      <IntelNav />
      <ScrollView contentContainerStyle={S.content}>
        <SolidCard variant="elevated" style={S.hero}>
          <View style={S.eyebrow}>
            <Text style={S.eyebrowText}>面试情报</Text>
          </View>
          <Text style={S.heading}>提前知道流程、轮次和真实体验</Text>
          <Text style={S.description}>
            聚合面试者和过来人的匿名样本,帮助你确认轮次、等待时间、题目相关性和团队沟通方式。
          </Text>
          <SolidButton
            title="写面试体验"
            variant="primary"
            style={S.heroButton}
            onPress={() => router.push("/submit" as never)}
          />
        </SolidCard>

        <MobileFilterBar
          industries={industries}
          cities={cities}
          sortOptions={SORT_OPTIONS}
          industry={industry}
          city={city}
          sort={sort}
          resultCount={filtered.length}
          onChangeIndustry={setIndustry}
          onChangeCity={setCity}
          onChangeSort={setSort}
          onReset={() => {
            setIndustry("all")
            setCity("all")
            setSort("score")
          }}
        />

        {filtered.length === 0 ? (
          <SolidCard variant="subtle" style={S.emptyCard}>
            <Text style={S.emptyTitle}>没有匹配的面试信号</Text>
            <Text style={S.emptyHint}>
              换一个行业或城市,或者贡献一条新的面试体验。
            </Text>
          </SolidCard>
        ) : (
          <View style={S.list}>
            {filtered.map((item) => (
              <SolidCard key={item.company.id} variant="subtle" style={S.card}>
                <View style={S.cardTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={S.tagRow}>
                      <Text style={S.companyName}>{item.company.shortName}</Text>
                      <TagPill tone="neutral">{item.role}</TagPill>
                      <TagPill tone="match">{item.rounds}</TagPill>
                    </View>
                    <Text style={S.signal} numberOfLines={3}>
                      {item.signal}
                    </Text>
                    <Text style={S.meta}>
                      {item.company.industry} · {item.company.city}
                    </Text>
                  </View>
                  <ScoreChip score={item.score.toFixed(1)} compact />
                </View>
                <View style={S.cardFooter}>
                  <SolidButton
                    title="看公司"
                    variant="primary"
                    size="sm"
                    onPress={() => router.push(`/company/${item.company.id}` as never)}
                  />
                </View>
              </SolidCard>
            ))}
          </View>
        )}
        <AppFooter />
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, gap: 14, paddingBottom: 24 },
  hero: { padding: 18, gap: 10 },
  eyebrow: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  eyebrowText: { fontSize: 12, fontWeight: "800", color: COLORS.primaryForeground },
  heading: { fontSize: 24, fontWeight: "800", color: COLORS.ink },
  description: { fontSize: 13, lineHeight: 20, color: COLORS.muted },
  heroButton: { alignSelf: "flex-start" },
  list: { gap: 12 },
  card: { padding: 16, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  companyName: { fontSize: 18, fontWeight: "800", color: COLORS.ink },
  signal: { marginTop: 8, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary },
  meta: { marginTop: 4, fontSize: 11, color: COLORS.mutedLight },
  cardFooter: { flexDirection: "row", justifyContent: "flex-end" },
  emptyCard: { padding: 18, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: COLORS.ink },
  emptyHint: { fontSize: 13, color: COLORS.muted, lineHeight: 20 },
})
