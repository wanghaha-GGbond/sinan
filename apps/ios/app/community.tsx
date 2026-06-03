import { useMemo, useState } from "react"
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { router } from "expo-router"
import { MessageCircleQuestion } from "lucide-react-native"

import { MobileFilterBar } from "../components/MobileFilterBar"
import { AppFooter, IntelNav } from "../components/AppShellBits"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"
import { SolidTopbar, TagPill } from "../components/SinanPrimitives"
import { companies, communityInsights } from "../data"
import { COLORS } from "../theme"

type SortKey = "useful" | "company"
const SORT_OPTIONS = [
  { value: "useful", label: "有用数高" },
  { value: "company", label: "公司名 A-Z" },
] as const

const TYPE_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "追问", label: "追问" },
  { value: "补充", label: "补充" },
] as const

type TypeValue = (typeof TYPE_OPTIONS)[number]["value"]

export default function CommunityScreen() {
  const [industry, setIndustry] = useState<string>("all")
  const [city, setCity] = useState<string>("all")
  const [type, setType] = useState<TypeValue>("all")
  const [sort, setSort] = useState<SortKey>("useful")

  const all = useMemo(() => communityInsights(), [])

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
      if (type !== "all" && item.type !== type) return false
      return true
    })
    matched.sort((a, b) => {
      if (sort === "useful") return b.usefulCount - a.usefulCount
      return a.company.shortName.localeCompare(b.company.shortName, "zh")
    })
    return matched
  }, [all, industry, city, type, sort])

  return (
    <View style={S.container}>
      <SolidTopbar back title="社区问答" subtitle="把评价后面的追问也看见" />
      <IntelNav />
      <ScrollView contentContainerStyle={S.content}>
        <SolidCard variant="elevated" style={S.hero}>
          <View style={S.eyebrow}>
            <Text style={S.eyebrowText}>社区问答</Text>
          </View>
          <Text style={S.heading}>把评价后面的追问也看见</Text>
          <Text style={S.description}>
            围绕一条评价继续追问、补充、打码展示,并保留匿名身份保护。
          </Text>
          <SolidButton
            title="发起新评价"
            variant="primary"
            style={S.heroButton}
            onPress={() => router.push("/submit" as never)}
          />
        </SolidCard>

        <View style={S.typeRow} accessibilityRole="tablist">
          <Text style={S.typeLabel}>类型</Text>
          {TYPE_OPTIONS.map((opt) => {
            const active = type === opt.value
            return (
              <TouchableOpacity
                key={opt.value}
                activeOpacity={0.85}
                onPress={() => setType(opt.value)}
                style={[S.typeChip, active ? S.typeChipActive : null]}
                testID={`community-type-${opt.value}`}
              >
                <Text style={[S.typeChipText, active ? S.typeChipTextActive : null]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

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
            setType("all")
            setSort("useful")
          }}
        />

        {filtered.length === 0 ? (
          <SolidCard variant="subtle" style={S.emptyCard}>
            <Text style={S.emptyTitle}>没有匹配的社区讨论</Text>
            <Text style={S.emptyHint}>
              换一个行业或城市,或者发起新评价。司南的追问空间依赖你。
            </Text>
          </SolidCard>
        ) : (
          <View style={S.list}>
            {filtered.map((item) => (
              <SolidCard key={item.id} variant="subtle" style={S.card}>
                <View style={S.cardHead}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={S.companyName}>{item.company.shortName}</Text>
                    <Text style={S.meta}>
                      {item.type === "追问" ? "追问" : "补充"} · {item.authorLabel}
                    </Text>
                  </View>
                  <View style={S.usefulPill}>
                    <Text style={S.usefulText}>有用 {item.usefulCount}</Text>
                  </View>
                </View>
                <View style={S.quote}>
                  <MessageCircleQuestion size={14} color={COLORS.primary} />
                  <Text style={S.quoteText} numberOfLines={4}>
                    {item.content}
                  </Text>
                </View>
                <View style={S.cardFooter}>
                  <SolidButton
                    title="看公司讨论"
                    variant="primary"
                    size="sm"
                    onPress={() => router.push(`/company/${item.companyId}` as never)}
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
  typeRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  typeLabel: { fontSize: 12, fontWeight: "800", color: COLORS.muted, marginRight: 4 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceHover,
  },
  typeChipActive: {
    backgroundColor: COLORS.dark,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
    elevation: 3,
  },
  typeChipText: { fontSize: 12, fontWeight: "800", color: COLORS.inkSoft },
  typeChipTextActive: { color: "#FFFFFF" },
  list: { gap: 12 },
  card: { padding: 16, gap: 10 },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  companyName: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  meta: { marginTop: 4, fontSize: 11, color: COLORS.muted },
  usefulPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceHover,
  },
  usefulText: { fontSize: 11, fontWeight: "800", color: COLORS.primaryForeground },
  quote: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  quoteText: { flex: 1, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary },
  cardFooter: { flexDirection: "row", justifyContent: "flex-end" },
  emptyCard: { padding: 18, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: COLORS.ink },
  emptyHint: { fontSize: 13, color: COLORS.muted, lineHeight: 20 },
})
