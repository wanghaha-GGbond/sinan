import { useMemo, useState } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { router } from "expo-router"

import { MobileFilterBar } from "../components/MobileFilterBar"
import { AppFooter, IntelNav } from "../components/AppShellBits"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"
import { ScoreChip, SolidTopbar, TagPill } from "../components/SinanPrimitives"
import { companies, salaryInsights } from "../data"
import { COLORS } from "../theme"

type SortKey = "score" | "samples" | "company"
const SORT_OPTIONS = [
  { value: "score", label: "兑现分高" },
  { value: "samples", label: "样本多" },
  { value: "company", label: "公司名 A-Z" },
] as const

export default function SalariesScreen() {
  const [industry, setIndustry] = useState<string>("all")
  const [city, setCity] = useState<string>("all")
  const [sort, setSort] = useState<SortKey>("score")

  const all = useMemo(() => salaryInsights(), [])

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
      if (sort === "samples") return b.samples - a.samples
      return a.company.shortName.localeCompare(b.company.shortName, "zh")
    })
    return matched
  }, [all, industry, city, sort])

  return (
    <View style={S.container}>
      <SolidTopbar back title="薪资透明" subtitle="岗位薪酬 · 样本量 · 兑现信号" />
      <IntelNav />
      <ScrollView contentContainerStyle={S.content}>
        <SolidCard variant="emerald" style={S.hero}>
          <View style={S.eyebrow}>
            <Text style={S.eyebrowText}>薪资透明</Text>
          </View>
          <Text style={S.heading}>按岗位看匿名薪资与兑现信号</Text>
          <Text style={S.description}>
            从现有评价里提取薪资区间、奖金兑现、调薪透明度和岗位样本,作为入职前的谈薪参考。
          </Text>
          <SolidButton
            title="贡献薪资样本"
            variant="dark"
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
            <Text style={S.emptyTitle}>没有匹配的薪资样本</Text>
            <Text style={S.emptyHint}>
              换一个行业或城市,或者贡献一条新的薪资样本。
            </Text>
          </SolidCard>
        ) : (
          <View style={S.list}>
            {filtered.map((item) => (
              <SolidCard
                key={`${item.company.id}-${item.role}`}
                variant="subtle"
                style={S.card}
              >
                <View style={S.cardTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={S.itemTitle}>{item.role}</Text>
                    <Text style={S.itemMeta}>{item.company.shortName}</Text>
                  </View>
                  <ScoreChip score={item.score.toFixed(1)} compact />
                </View>
                <View style={S.rangeBox}>
                  <Text style={S.rangeLabel}>匿名薪资区间</Text>
                  <Text style={S.rangeValue}>{item.range}</Text>
                  <Text style={S.rangeMeta}>
                    中位参考:{item.median} · {item.samples} 个样本
                  </Text>
                </View>
                <Text style={S.body} numberOfLines={4}>
                  {item.company.highlights.find((h) => /薪资|福利|兑现/.test(h)) ??
                    "来自匿名评价中的薪资兑现、奖金和调薪信号。"}
                </Text>
                <View style={S.cardFooter}>
                  <SolidButton
                    title="公司页"
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
  eyebrowText: { fontSize: 12, fontWeight: "800", color: COLORS.primaryForeground },
  heading: { fontSize: 24, fontWeight: "800", color: COLORS.ink },
  description: { fontSize: 13, lineHeight: 20, color: COLORS.muted },
  heroButton: { alignSelf: "flex-start" },
  list: { gap: 12 },
  card: { padding: 16, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  itemTitle: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  itemMeta: { marginTop: 4, fontSize: 12, color: COLORS.muted },
  rangeBox: {
    borderRadius: 16,
    backgroundColor: COLORS.surfaceHover,
    padding: 14,
    gap: 4,
  },
  rangeLabel: { fontSize: 11, color: COLORS.muted },
  rangeValue: { fontSize: 22, fontWeight: "800", color: COLORS.ink },
  rangeMeta: { fontSize: 12, color: COLORS.muted },
  body: { fontSize: 13, lineHeight: 20, color: COLORS.textSecondary },
  cardFooter: { flexDirection: "row", justifyContent: "flex-end" },
  emptyCard: { padding: 18, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: COLORS.ink },
  emptyHint: { fontSize: 13, color: COLORS.muted, lineHeight: 20 },
})
