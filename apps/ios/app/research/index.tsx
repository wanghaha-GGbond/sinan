import { useEffect, useState } from "react"
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { Link } from "expo-router"

import { SolidCard } from "../../components/SolidCard"
import { SolidTopbar } from "../../components/SinanPrimitives"
import { getResearchReports, type ResearchListItem } from "../../lib/api"
import { COLORS } from "../../theme"

export default function ResearchScreen() {
  const [reports, setReports] = useState<ResearchListItem[]>([])
  const [summary, setSummary] = useState<{ observations: number; externalEvidence: number } | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getResearchReports()
      .then((result) => { if (active) { setReports(result.companies); setSummary(result.summary) } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "研报加载失败") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return (
    <View style={S.container}>
      <SolidTopbar title="司南研报" subtitle="公开证据 · 谨慎结论" />
      {loading ? <ActivityIndicator style={S.loader} color={COLORS.primary} /> : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.slug}
          contentContainerStyle={S.content}
          ListHeaderComponent={<View style={S.hero}><Text style={S.heroTitle}>公司真正的方向</Text><Text style={S.heroText}>{summary ? `${summary.observations} 条公开观察 · ${summary.externalEvidence} 条外部证据` : "每个分数同时展示可信度与证据边界"}</Text>{error ? <Text style={S.error}>{error}</Text> : null}</View>}
          ListEmptyComponent={<Text style={S.empty}>{error || "暂无研报"}</Text>}
          renderItem={({ item, index }) => (
            <Link href={`/research/${item.slug}`} asChild>
              <TouchableOpacity activeOpacity={0.9}>
                <SolidCard variant="subtle" style={S.card}>
                  <View style={S.row}><Text style={S.rank}>{String(index + 1).padStart(2, "0")}</Text><View style={S.main}><Text style={S.name}>{item.name}</Text><Text style={S.meta}>{item.city} · {item.industry}</Text></View><Text style={S.score}>{item.overallScore}</Text></View>
                  <Text style={S.line}>{item.oneLine}</Text><Text style={S.confidence}>{item.funTag} · 可信度 {item.confidence}%</Text>
                </SolidCard>
              </TouchableOpacity>
            </Link>
          )}
        />
      )}
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg }, loader: { marginTop: 64 }, content: { padding: 16, paddingBottom: 88, gap: 12 },
  hero: { paddingVertical: 12 }, heroTitle: { fontSize: 28, fontWeight: "900", color: COLORS.ink }, heroText: { marginTop: 7, color: COLORS.muted }, error: { marginTop: 10, color: COLORS.danger }, empty: { padding: 24, color: COLORS.muted },
  card: { padding: 18 }, row: { flexDirection: "row", alignItems: "center", gap: 12 }, rank: { color: COLORS.muted, fontWeight: "800" }, main: { flex: 1 }, name: { fontSize: 18, fontWeight: "900", color: COLORS.ink }, meta: { marginTop: 4, fontSize: 12, color: COLORS.muted }, score: { fontSize: 24, fontWeight: "900", color: COLORS.primary }, line: { marginTop: 14, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary }, confidence: { marginTop: 10, fontSize: 12, color: COLORS.muted },
})
