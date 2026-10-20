import { useEffect, useState } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native"
import { Link, useLocalSearchParams, router } from "expo-router"

import { AppFooter, IntelNav } from "../../../components/AppShellBits"
import { MobileReviewCard } from "../../../components/MobileReviewCard"
import { SolidButton } from "../../../components/SolidButton"
import { SolidCard } from "../../../components/SolidCard"
import { SolidTopbar } from "../../../components/SinanPrimitives"
import {
  getCompany,
  getCompanyReviews,
  type CompanyListItem,
  type ReviewListItem,
} from "../../../lib/api"
import { COLORS, RADIUS } from "../../../theme"

export default function CompanyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [company, setCompany] = useState<CompanyListItem | null>(null)
  const [reviews, setReviews] = useState<ReviewListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    if (!id) return
    setLoading(true)
    Promise.all([getCompany(id), getCompanyReviews(id)])
      .then(([nextCompany, nextReviews]) => {
        if (!active) return
        setCompany(nextCompany)
        setReviews(nextReviews)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "公司数据加载失败")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [id])

  return (
    <View style={S.container}>
      <SolidTopbar title="在场" subtitle="公司详情" back />
      <IntelNav />
      {loading ? <ActivityIndicator style={S.loader} color={COLORS.primary} /> : (
        <ScrollView contentContainerStyle={S.content}>
          {error ? (
            <SolidCard variant="subtle" style={S.card}>
              <Text style={S.error}>{error}</Text>
              <SolidButton title="重新加载" variant="secondary" size="sm" onPress={() => router.replace(`/company/${id}`)} style={S.retry} />
            </SolidCard>
          ) : null}
          {company ? (
            <>
              <SolidCard variant="elevated" style={S.heroCard}>
                <Text style={S.title}>{company.shortName ?? company.name}</Text>
                <Text style={S.meta}>{company.industry} · {company.city} · {company.size ?? "规模待补充"}</Text>
                {company.description ? <Text style={S.description}>{company.description}</Text> : null}
                <View style={S.scoreRow}>
                  <View style={S.scoreBlock}>
                    <Text style={S.score}>{company.directionScore?.toFixed(1) ?? "—"}</Text>
                    <Text style={S.scoreLabel}>方向分</Text>
                  </View>
                  <View style={S.metricBlock}>
                    <Text style={S.metricValue}>{company.recommendationRate ?? 0}%</Text>
                    <Text style={S.metricLabel}>推荐入职</Text>
                  </View>
                  <View style={S.metricBlock}>
                    <Text style={S.metricValue}>{company.reviewCount ?? reviews.length}</Text>
                    <Text style={S.metricLabel}>公开评价</Text>
                  </View>
                </View>
                {(company.riskTags ?? []).length > 0 ? (
                  <View style={S.riskWrap}>
                    {(company.riskTags ?? []).slice(0, 4).map((tag) => <Text key={tag} style={S.riskTag}>#{tag}</Text>)}
                  </View>
                ) : null}
                <View style={S.primaryActions}>
                  <Link href={{ pathname: "/submit", params: { companyId: company.id } }} asChild>
                    <SolidButton title="写匿名评价" style={S.action} />
                  </Link>
                  <SolidButton title="查看研报" variant="secondary" onPress={() => router.push("/research")} style={S.action} />
                </View>
              </SolidCard>

              <View style={S.sectionHeader}>
                <View>
                  <Text style={S.sectionTitle}>公开评价</Text>
                  <Text style={S.sectionDesc}>先看真实经历，再决定是否深入了解这家公司。</Text>
                </View>
                <Text style={S.sectionCount}>{reviews.length} 条</Text>
              </View>
              {reviews.length === 0 ? (
                <SolidCard variant="subtle" style={S.emptyCard}>
                  <Text style={S.emptyTitle}>这家公司还没有已审核公开的评价。</Text>
                  <Text style={S.emptyText}>成为第一个补上这段经历的人。</Text>
                  <Link href={{ pathname: "/submit", params: { companyId: company.id } }} asChild>
                    <SolidButton title="写第一条评价" size="sm" style={S.emptyAction} />
                  </Link>
                </SolidCard>
              ) : reviews.map((review) => (
                <MobileReviewCard
                  key={review.id}
                  review={review}
                  companyId={company.id}
                  expanded
                  showDetailLink={false}
                  showDiscussionAction={false}
                  onBlocked={() => setReviews((current) => current.filter((item) => item.id !== review.id))}
                />
              ))}
            </>
          ) : null}
          <AppFooter />
        </ScrollView>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loader: { marginTop: 64 },
  content: { padding: 16, gap: 16, paddingBottom: 96 },
  card: { padding: 20 },
  heroCard: { padding: 20, gap: 12 },
  error: { color: COLORS.danger, fontWeight: "700", lineHeight: 20 },
  retry: { alignSelf: "flex-start", marginTop: 10 },
  title: { fontSize: 25, fontWeight: "900", color: COLORS.ink },
  meta: { marginTop: 4, fontSize: 13, color: COLORS.muted },
  description: { fontSize: 14, lineHeight: 22, color: COLORS.textSecondary },
  scoreRow: { flexDirection: "row", alignItems: "stretch", gap: 10 },
  scoreBlock: { minWidth: 92, borderRadius: RADIUS.lg, backgroundColor: COLORS.primarySoft, padding: 12 },
  score: { fontSize: 28, lineHeight: 32, fontWeight: "900", color: COLORS.primaryDark },
  scoreLabel: { marginTop: 2, fontSize: 12, fontWeight: "700", color: COLORS.primaryForeground },
  metricBlock: { flex: 1, borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceHover, padding: 12, justifyContent: "center" },
  metricValue: { fontSize: 18, fontWeight: "900", color: COLORS.ink },
  metricLabel: { marginTop: 2, fontSize: 12, color: COLORS.muted },
  riskWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  riskTag: { borderRadius: 999, backgroundColor: COLORS.riskSoft, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: "700", color: COLORS.riskForeground },
  primaryActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  action: { alignSelf: "flex-start" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 10 },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: COLORS.ink },
  sectionDesc: { marginTop: 4, fontSize: 12, color: COLORS.muted },
  sectionCount: { fontSize: 12, color: COLORS.muted },
  emptyCard: { padding: 20 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  emptyText: { marginTop: 6, fontSize: 13, color: COLORS.muted, lineHeight: 20 },
  emptyAction: { alignSelf: "flex-start", marginTop: 14 },
})
