import { useMemo, useState } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { router } from "expo-router"
import { Coffee, MonitorSmartphone, TrainFront } from "lucide-react-native"

import { MobileFilterBar } from "../components/MobileFilterBar"
import { AppFooter, IntelNav } from "../components/AppShellBits"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"
import { ScoreChip, SolidTopbar, TagPill } from "../components/SinanPrimitives"
import { companies, benefitInsights } from "../data"
import { COLORS } from "../theme"

type SortKey = "office" | "commute" | "canteen" | "company"
const SORT_OPTIONS = [
  { value: "office", label: "综合办公" },
  { value: "commute", label: "通勤便利" },
  { value: "canteen", label: "食堂好" },
  { value: "company", label: "公司名 A-Z" },
] as const

export default function BenefitsScreen() {
  const [industry, setIndustry] = useState<string>("all")
  const [city, setCity] = useState<string>("all")
  const [sort, setSort] = useState<SortKey>("office")

  const all = useMemo(() => benefitInsights(), [])

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
      if (sort === "office") return b.officeScore - a.officeScore
      if (sort === "commute") return b.commuteScore - a.commuteScore
      if (sort === "canteen") return b.canteenScore - a.canteenScore
      return a.company.shortName.localeCompare(b.company.shortName, "zh")
    })
    return matched
  }, [all, industry, city, sort])

  return (
    <View style={S.container}>
      <SolidTopbar back title="福利与办公体验" subtitle="把福利从口号拆成真实体验" />
      <IntelNav />
      <ScrollView contentContainerStyle={S.content}>
        <SolidCard variant="emerald" style={S.hero}>
          <View style={S.eyebrow}>
            <Text style={S.eyebrowText}>福利与办公体验</Text>
          </View>
          <Text style={S.heading}>把福利从口号拆成真实体验</Text>
          <Text style={S.description}>
            聚合办公环境、通勤、食堂、下午茶、工位和设备等匿名样本,保留司南的「公司体感」表达。
          </Text>
          <SolidButton
            title="补充办公体验"
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
            setSort("office")
          }}
        />

        {filtered.length === 0 ? (
          <SolidCard variant="subtle" style={S.emptyCard}>
            <Text style={S.emptyTitle}>没有匹配的办公体验</Text>
            <Text style={S.emptyHint}>
              换一个行业或城市,或者贡献一条新的办公体验。
            </Text>
          </SolidCard>
        ) : (
          <View style={S.list}>
            {filtered.map((item) => (
              <SolidCard key={item.company.id} variant="subtle" style={S.card}>
                <View style={S.cardTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={S.companyName}>{item.company.shortName}</Text>
                    <View style={S.tagRow}>
                      {item.signals.map((sig) => (
                        <TagPill key={sig} tone="neutral">
                          {sig}
                        </TagPill>
                      ))}
                    </View>
                    <Text style={S.signal} numberOfLines={3}>
                      {item.headline}
                    </Text>
                  </View>
                  <ScoreChip score={item.officeScore.toFixed(1)} compact />
                </View>
                <View style={S.scoreRow}>
                  <ScoreCell icon={<TrainFront size={14} color={COLORS.primary} />} label="通勤" value={item.commuteScore.toFixed(1)} />
                  <ScoreCell icon={<Coffee size={14} color={COLORS.primary} />} label="食堂" value={item.canteenScore.toFixed(1)} />
                  <ScoreCell icon={<MonitorSmartphone size={14} color={COLORS.primary} />} label="综合" value={item.officeScore.toFixed(1)} />
                </View>
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

function ScoreCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={S.scoreCell}>
      {icon}
      <Text style={S.scoreLabel}>{label}</Text>
      <Text style={S.scoreValue}>{value}</Text>
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
  companyName: { fontSize: 18, fontWeight: "800", color: COLORS.ink },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  signal: { marginTop: 8, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary },
  scoreRow: { flexDirection: "row", gap: 8 },
  scoreCell: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceHover,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
  },
  scoreLabel: { fontSize: 11, color: COLORS.muted },
  scoreValue: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  cardFooter: { flexDirection: "row", justifyContent: "flex-end" },
  emptyCard: { padding: 18, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: COLORS.ink },
  emptyHint: { fontSize: 13, color: COLORS.muted, lineHeight: 20 },
})
