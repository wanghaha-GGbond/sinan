import { useMemo, useState } from "react"
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native"
import { Link, router } from "expo-router"
import { popularSearches, searchCompanies, type MobileCompany } from "../data"
import { COLORS, RADIUS, SHADOWS } from "../theme"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"
import { AppFooter, IntelNav } from "../components/AppShellBits"
import { SolidInput } from "../components/SolidInput"
import { MetricPill, ScoreChip, SolidTopbar, TagPill } from "../components/SinanPrimitives"

export default function SearchScreen() {
  const [query, setQuery] = useState("")
  const results = useMemo(() => searchCompanies(query), [query])

  return (
    <View style={S.container}>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={S.list}
        ListHeaderComponent={
          <View style={S.header}>
            <SolidTopbar back title="搜索公司" subtitle="知道公司名时再搜，推荐流仍是主入口。" />
            <IntelNav />
            <View style={S.searchSection}>
              <SolidInput
                placeholder="搜索公司、行业、城市、岗位..."
                value={query}
                onChangeText={setQuery}
                autoFocus
                style={S.input}
              />
              <View style={S.popularWrap}>
                {popularSearches.map((item) => (
                  <SolidButton
                    key={item}
                    title={item}
                    variant="secondary"
                    size="sm"
                    onPress={() => setQuery(item)}
                  />
                ))}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <SolidCard variant="subtle" style={S.emptyCard}>
            <Text style={S.emptyTitle}>没有找到这家公司</Text>
            <Text style={S.emptyText}>你可以提交公司注册信息，审核通过后开放评价。</Text>
            <SolidButton
              title="添加公司"
              variant="primary"
              size="md"
              onPress={() => router.push(`/submit?mode=add-company&name=${encodeURIComponent(query.trim())}`)}
              style={S.emptyButton}
            />
          </SolidCard>
        }
        renderItem={({ item }) => <CompanySearchCard company={item} />}
        ListFooterComponent={
          <View style={S.footer}>
            <SolidButton title="返回推荐流" variant="ghost" size="sm" onPress={() => router.push("/")} />
            <AppFooter />
          </View>
        }
      />
    </View>
  )
}

function CompanySearchCard({ company }: { company: MobileCompany }) {
  return (
    <Link href={`/company/${company.id}`} asChild>
      <TouchableOpacity activeOpacity={0.92}>
        <SolidCard variant="subtle" style={S.card}>
          <View style={S.cardTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={S.name} numberOfLines={1}>{company.shortName}</Text>
              <Text style={S.meta} numberOfLines={1}>{company.industry} · {company.city}</Text>
            </View>
            <ScoreChip score={company.directionScore} compact />
          </View>

          <View style={S.metrics}>
            <MetricPill label="推荐入职率" value={`${company.recommendationRate}%`} />
            <View style={S.salaryPill}>
              <Text style={S.salaryLabel}>薪资区间</Text>
              <Text style={S.salaryValue}>{company.salaryRange}</Text>
            </View>
          </View>

          <View style={S.tags}>
            {company.riskTags.slice(0, 3).map((tag) => (
              <TagPill key={tag} tone={tag.includes("压力") || tag.includes("波动") ? "risk" : "neutral"}>
                #{tag}
              </TagPill>
            ))}
          </View>

          <Text style={S.reviewCount}>{company.reviewCount.toLocaleString()} 条真实体验</Text>
          <Text style={S.vibe}>公司体感：{company.vibe}</Text>
          <View style={S.actionRow}>
            <SolidButton title="看这家公司  ›" variant="primary" size="sm" />
          </View>
        </SolidCard>
      </TouchableOpacity>
    </Link>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  list: { paddingBottom: 88 },
  header: { gap: 16 },
  searchSection: { paddingHorizontal: 16, gap: 12 },
  input: { backgroundColor: COLORS.surfaceHover },
  popularWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: { marginHorizontal: 16, marginTop: 14, padding: 16 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  name: { fontSize: 18, fontWeight: "800", color: COLORS.ink },
  meta: { fontSize: 13, color: COLORS.muted, marginTop: 5 },
  metrics: { flexDirection: "row", gap: 8, marginTop: 16 },
  salaryPill: {
    flex: 1,
    minHeight: 62,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceHover,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
  },
  salaryLabel: { fontSize: 11, color: COLORS.muted, marginBottom: 4 },
  salaryValue: { fontSize: 14, fontWeight: "800", color: COLORS.inkSoft },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  reviewCount: { fontSize: 13, color: COLORS.muted, marginTop: 12 },
  vibe: { fontSize: 12, color: COLORS.muted, marginTop: 8 },
  actionRow: { alignItems: "flex-start", marginTop: 12 },
  emptyCard: { marginHorizontal: 16, marginTop: 16, padding: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: COLORS.ink },
  emptyText: { fontSize: 13, color: COLORS.muted, lineHeight: 20, marginTop: 8 },
  emptyButton: { alignSelf: "flex-start", marginTop: 14 },
  footer: { alignItems: "stretch", paddingHorizontal: 16, paddingTop: 14, gap: 12 },
})
