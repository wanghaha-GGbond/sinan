import { useEffect, useState } from "react"
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useLocalSearchParams } from "expo-router"

import { SolidCard } from "../../components/SolidCard"
import { SolidTopbar } from "../../components/SinanPrimitives"
import { getResearchReport, type ResearchReport } from "../../lib/api"
import { COLORS } from "../../theme"

export default function ResearchDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [report, setReport] = useState<ResearchReport | null>(null)
  const [error, setError] = useState("")
  useEffect(() => {
    let active = true
    if (slug) getResearchReport(slug).then((value) => { if (active) setReport(value) }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "研报加载失败") })
    return () => { active = false }
  }, [slug])

  return <View style={S.container}><SolidTopbar back title="在场研报" subtitle="证据可回溯" />{!report && !error ? <ActivityIndicator style={S.loader} color={COLORS.primary} /> : <ScrollView contentContainerStyle={S.content}>{error ? <Text style={S.error}>{error}</Text> : null}{report ? <>
    <SolidCard variant="elevated" style={S.hero}><Text style={S.meta}>{report.card.city} · {report.card.industry} · {report.card.recommendationTier}</Text><Text style={S.title}>{report.card.name}研究报告</Text><Text style={S.lead}>{report.card.oneLine}</Text><Text style={S.bigScore}>{report.index.overallScore}<Text style={S.outOf}> / 100 · 可信度 {report.index.confidence}%</Text></Text></SolidCard>
    <Section title="五维研究指数">{Object.entries(report.index.components).map(([key, value]) => <View key={key} style={S.metric}><Text style={S.metricLabel}>{report.labels.components[key] ?? key}</Text><View style={S.track}><View style={[S.fill, { width: `${value.score}%` }]} /></View><Text style={S.metricScore}>{value.score}</Text><Text style={S.note}>可信度 {value.confidence}% · {value.evidenceCount} 条证据{value.limitations[0] ? ` · ${value.limitations[0]}` : ""}</Text></View>)}</Section>
    <Section title="值得关注的机会">{report.card.opportunityDetails.length ? report.card.opportunityDetails.map((item) => <Evidence key={item.signal} item={item} />) : <Text style={S.note}>当前缺少可用机会判断。</Text>}</Section>
    <Section title="需要核实的风险">{report.card.riskDetails.length ? report.card.riskDetails.map((item) => <Evidence key={item.signal} item={item} />) : <Text style={S.note}>暂无足够证据支持确定性风险结论。</Text>}</Section>
    <Section title="候选人建议"><Text style={S.body}>{report.card.candidateAdvice}</Text></Section>
    <Text style={S.boundary}>阅读边界：公司级公开信号不能代表每个部门、城市、岗位或员工，关键结论请在面试中复核。</Text>
  </> : null}</ScrollView>}</View>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={S.section}><Text style={S.sectionTitle}>{title}</Text>{children}</View> }
function Evidence({ item }: { item: { signal: string; basis: string; sourceUrl: string } }) { return <SolidCard variant="subtle" style={S.evidence}><Text style={S.evidenceTitle}>{item.signal}</Text><Text style={S.body}>{item.basis}</Text>{item.sourceUrl ? <TouchableOpacity onPress={() => void Linking.openURL(item.sourceUrl)}><Text style={S.link}>查看公开来源 ↗</Text></TouchableOpacity> : null}</SolidCard> }
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg }, loader: { marginTop: 64 }, content: { padding: 16, paddingBottom: 90, gap: 24 }, error: { color: COLORS.danger }, hero: { padding: 20 }, meta: { color: COLORS.muted, fontSize: 12 }, title: { marginTop: 8, fontSize: 28, fontWeight: "900", color: COLORS.ink }, lead: { marginTop: 12, color: COLORS.textSecondary, lineHeight: 22 }, bigScore: { marginTop: 18, fontSize: 34, fontWeight: "900", color: COLORS.primary }, outOf: { fontSize: 12, color: COLORS.muted }, section: { gap: 10 }, sectionTitle: { fontSize: 20, fontWeight: "900", color: COLORS.ink, marginBottom: 2 }, metric: { gap: 6, paddingVertical: 5 }, metricLabel: { fontWeight: "800", color: COLORS.ink }, track: { height: 7, borderRadius: 99, backgroundColor: COLORS.surfaceHover, overflow: "hidden" }, fill: { height: 7, borderRadius: 99, backgroundColor: COLORS.primary }, metricScore: { position: "absolute", right: 0, top: 4, fontWeight: "900", color: COLORS.ink }, note: { fontSize: 11, lineHeight: 17, color: COLORS.muted }, evidence: { padding: 16 }, evidenceTitle: { fontWeight: "900", color: COLORS.ink }, body: { marginTop: 7, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary }, link: { marginTop: 10, color: COLORS.primary, fontWeight: "800" }, boundary: { padding: 16, borderRadius: 16, backgroundColor: COLORS.dangerSoft, color: COLORS.textSecondary, fontSize: 12, lineHeight: 19 },
})
