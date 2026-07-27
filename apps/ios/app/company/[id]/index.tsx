import { useEffect, useState } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native"
import { Link, useLocalSearchParams } from "expo-router"

import { AppFooter, IntelNav } from "../../../components/AppShellBits"
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
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    if (!id) return
    Promise.all([getCompany(id), getCompanyReviews(id)])
      .then(([nextCompany, nextReviews]) => {
        if (!active) return
        setCompany(nextCompany)
        setReviews(nextReviews)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "公司数据加载失败")
      })
    return () => { active = false }
  }, [id])

  return (
    <View style={S.container}>
      <SolidTopbar title="司南" subtitle="公司详情" back />
      <IntelNav />
      {!company && !error ? <ActivityIndicator style={S.loader} color={COLORS.primary} /> : (
        <ScrollView contentContainerStyle={S.content}>
          {error ? <SolidCard variant="subtle" style={S.card}><Text style={S.error}>{error}</Text></SolidCard> : null}
          {company ? (
            <>
              <SolidCard variant="elevated" style={S.card}>
                <Text style={S.title}>{company.shortName ?? company.name}</Text>
                <Text style={S.meta}>{company.industry} · {company.city} · {company.size ?? "规模待补充"}</Text>
                {company.description ? <Text style={S.description}>{company.description}</Text> : null}
                <View style={S.metrics}>
                  <Text style={S.metric}>方向分 {company.directionScore?.toFixed(1) ?? "—"}</Text>
                  <Text style={S.metric}>推荐 {company.recommendationRate ?? 0}%</Text>
                  <Text style={S.metric}>{company.reviewCount ?? reviews.length} 条评价</Text>
                </View>
                <Link href={{ pathname: "/submit", params: { companyId: company.id } }} asChild>
                  <SolidButton title="匿名评价" style={S.action} />
                </Link>
              </SolidCard>
              <View><Text style={S.sectionTitle}>公开评价</Text>
                {reviews.length === 0 ? <Text style={S.empty}>这家公司还没有已审核公开的评价。</Text> : reviews.map((review) => (
                  <SolidCard key={review.id} variant="subtle" style={S.review}>
                    <Text style={S.reviewMeta}>{review.authorLabel} · {review.directionScore} 分</Text>
                    <Text style={S.reviewTitle}>{review.title}</Text>
                    {review.content ? <Text style={S.reviewContent} numberOfLines={5}>{review.content}</Text> : null}
                  </SolidCard>
                ))}
              </View>
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
  content: { padding: 16, gap: 20, paddingBottom: 88 },
  card: { padding: 20 },
  error: { color: COLORS.danger, fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "900", color: COLORS.ink },
  meta: { marginTop: 6, fontSize: 13, color: COLORS.muted },
  description: { marginTop: 14, fontSize: 14, lineHeight: 22, color: COLORS.textSecondary },
  metrics: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { overflow: "hidden", borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceHover, paddingHorizontal: 10, paddingVertical: 7, color: COLORS.inkSoft, fontWeight: "700" },
  action: { alignSelf: "flex-start", marginTop: 18 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: COLORS.ink, marginBottom: 10 },
  empty: { color: COLORS.muted, paddingVertical: 20 },
  review: { padding: 16, marginBottom: 10 },
  reviewMeta: { fontSize: 12, color: COLORS.muted },
  reviewTitle: { marginTop: 6, fontSize: 16, fontWeight: "800", color: COLORS.ink },
  reviewContent: { marginTop: 8, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary },
})
