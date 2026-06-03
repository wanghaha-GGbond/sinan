import { useMemo, useState } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { router } from "expo-router"
import { MapPin } from "lucide-react-native"

import { MobileFilterBar } from "../components/MobileFilterBar"
import { AppFooter, IntelNav } from "../components/AppShellBits"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"
import { ScoreChip, SolidTopbar, TagPill } from "../components/SinanPrimitives"
import { companies, opportunityInsights } from "../data"
import { COLORS } from "../theme"

type SortKey = "fit" | "city" | "company"
const SORT_OPTIONS = [
  { value: "fit", label: "适配度高" },
  { value: "city", label: "城市 A-Z" },
  { value: "company", label: "公司名 A-Z" },
] as const

export default function JobsScreen() {
  const [industry, setIndustry] = useState<string>("all")
  const [city, setCity] = useState<string>("all")
  const [sort, setSort] = useState<SortKey>("fit")

  const all = useMemo(() => opportunityInsights().slice(0, 30), [])

  const industries = useMemo(
    () => Array.from(new Set(companies.map((c) => c.industry))).sort(),
    []
  )
  const opportunityCities = useMemo(
    () => Array.from(new Set(all.map((o) => o.company.city))).sort(),
    [all]
  )

  const filtered = useMemo(() => {
    const matched = all.filter((item) => {
      if (industry !== "all" && item.company.industry !== industry) return false
      if (city !== "all" && item.company.city !== city) return false
      return true
    })
    matched.sort((a, b) => {
      if (sort === "fit") return b.fitScore - a.fitScore
      if (sort === "city") return a.company.city.localeCompare(b.company.city, "zh")
      return a.company.shortName.localeCompare(b.company.shortName, "zh")
    })
    return matched
  }, [all, industry, city, sort])

  return (
    <View style={S.container}>
      <SolidTopbar back title="机会雷达" subtitle="岗位 · 城市 · 方向分" />
      <IntelNav />
      <ScrollView contentContainerStyle={S.content}>
        <SolidCard variant="risk" style={S.hero}>
          <View style={S.eyebrow}>
            <Text style={S.eyebrowText}>机会雷达</Text>
          </View>
          <Text style={S.heading}>先看岗位背后的公司体验</Text>
          <Text style={S.description}>
            不是职位列表的搬运,而是把岗位、城市、方向分、风险标签和过来人提醒放在一起做决策。
          </Text>
          <SolidButton
            title="搜索公司"
            variant="dark"
            style={S.heroButton}
            onPress={() => router.push("/search" as never)}
          />
        </SolidCard>

        <MobileFilterBar
          industries={industries}
          cities={opportunityCities}
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
            setSort("fit")
          }}
        />

        {filtered.length === 0 ? (
          <SolidCard variant="subtle" style={S.emptyCard}>
            <Text style={S.emptyTitle}>没有匹配的岗位</Text>
            <Text style={S.emptyHint}>
              换一个城市或行业,或者在搜索里直接看公司。
            </Text>
          </SolidCard>
        ) : (
          <View style={S.grid}>
            {filtered.map((item) => (
              <SolidCard key={`${item.company.id}-${item.role}`} variant="subtle" style={S.card}>
                <View style={S.cardTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={S.role}>{item.role}</Text>
                    <View style={S.metaRow}>
                      <MapPin size={12} color={COLORS.muted} />
                      <Text style={S.meta}>
                        {item.company.shortName} · {item.company.city}
                      </Text>
                    </View>
                  </View>
                  <ScoreChip score={item.fitScore.toFixed(1)} compact />
                </View>
                <Text style={S.signal} numberOfLines={3}>
                  {item.signal}
                </Text>
                <View style={S.cardFooter}>
                  <SolidButton
                    title="查看公司情报"
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  eyebrowText: { fontSize: 12, fontWeight: "800", color: COLORS.riskForeground },
  heading: { fontSize: 24, fontWeight: "800", color: COLORS.ink },
  description: { fontSize: 13, lineHeight: 20, color: COLORS.muted },
  heroButton: { alignSelf: "flex-start" },
  grid: { gap: 12 },
  card: { padding: 16, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  role: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  meta: { fontSize: 12, color: COLORS.muted },
  signal: { fontSize: 13, lineHeight: 20, color: COLORS.textSecondary },
  cardFooter: { flexDirection: "row", justifyContent: "flex-end" },
  emptyCard: { padding: 18, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: COLORS.ink },
  emptyHint: { fontSize: 13, color: COLORS.muted, lineHeight: 20 },
})
