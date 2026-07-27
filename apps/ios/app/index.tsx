import { useEffect, useState } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { Link } from "expo-router"

import { AppFooter, HomeHeaderActions, IntelNav } from "../components/AppShellBits"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"
import { ScoreChip, SolidTopbar } from "../components/SinanPrimitives"
import { searchCompanies, type CompanyListItem } from "../lib/api"
import { COLORS } from "../theme"

export default function HomeScreen() {
  const [companies, setCompanies] = useState<CompanyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    searchCompanies()
      .then((items) => { if (active) setCompanies(items.slice(0, 8)) })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "公司数据加载失败") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return (
    <View style={S.container}>
      <SolidTopbar title="司南 推荐" subtitle="邀请制 Beta" right={<HomeHeaderActions />} />
      <IntelNav />
      <ScrollView contentContainerStyle={S.content}>
        <SolidCard variant="elevated" style={S.hero}>
          <Text style={S.heroLabel}>真实公司 · 匿名评价 · 可追溯研报</Text>
          <Text style={S.heroTitle}>入职前，先看清方向</Text>
          <View style={S.heroActions}><Link href="/search" asChild><SolidButton title="搜索公司" /></Link><Link href="/research" asChild><SolidButton title="浏览研报" variant="secondary" /></Link></View>
        </SolidCard>

        <Text style={S.sectionTitle}>最新公司</Text>
        {loading ? <ActivityIndicator style={S.loader} color={COLORS.primary} /> : null}
        {error ? <Text style={S.error}>{error}</Text> : null}
        {!loading && !error && companies.length === 0 ? <Text style={S.empty}>首批公司正在审核入库。</Text> : null}
        <View style={S.list}>
          {companies.map((company) => (
            <Link key={company.id} href={`/company/${company.id}`} asChild>
              <TouchableOpacity activeOpacity={0.92}>
                <SolidCard variant="subtle" style={S.card}>
                  <View style={S.cardHead}><View style={S.cardMain}><Text style={S.name}>{company.shortName ?? company.name}</Text><Text style={S.meta}>{company.industry} · {company.city} · {company.size ?? "规模待补充"}</Text></View><ScoreChip score={company.directionScore ?? 0} /></View>
                  {company.description ? <Text style={S.description} numberOfLines={3}>{company.description}</Text> : null}
                  <View style={S.cardBottom}><Text style={S.reviews}>{company.reviewCount ?? 0} 条公开评价</Text><SolidButton title="看这家公司" size="sm" /></View>
                </SolidCard>
              </TouchableOpacity>
            </Link>
          ))}
        </View>
        <AppFooter />
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg }, content: { padding: 16, paddingBottom: 88 }, hero: { padding: 20 }, heroLabel: { fontSize: 12, fontWeight: "800", color: COLORS.primary }, heroTitle: { marginTop: 6, fontSize: 26, fontWeight: "900", color: COLORS.ink }, heroActions: { marginTop: 18, flexDirection: "row", flexWrap: "wrap", gap: 8 }, sectionTitle: { marginTop: 24, marginBottom: 12, fontSize: 18, fontWeight: "900", color: COLORS.ink }, loader: { marginVertical: 36 }, error: { padding: 16, color: COLORS.danger }, empty: { padding: 16, color: COLORS.muted }, list: { gap: 12 }, card: { padding: 18 }, cardHead: { flexDirection: "row", gap: 12 }, cardMain: { flex: 1 }, name: { fontSize: 18, fontWeight: "900", color: COLORS.ink }, meta: { marginTop: 5, fontSize: 12, color: COLORS.muted }, description: { marginTop: 12, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary }, cardBottom: { marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, reviews: { flex: 1, fontSize: 12, color: COLORS.muted },
})
