import { ScrollView, StyleSheet, Text, View } from "react-native"
import { Link, useLocalSearchParams } from "expo-router"
import { getCompany, getCompanyReviews } from "../../../data"
import { COLORS } from "../../../theme"
import { CompanyReviewFeed } from "../../../components/CompanyReviewFeed"
import { AppFooter, IntelNav } from "../../../components/AppShellBits"
import { SolidButton } from "../../../components/SolidButton"
import { SolidCard } from "../../../components/SolidCard"
import { SolidTopbar } from "../../../components/SinanPrimitives"

export default function CompanyReviewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const company = getCompany(id ?? "")
  const reviews = getCompanyReviews(company.id)

  return (
    <View style={S.container}>
      <SolidTopbar back title="公司评价阅读区" subtitle={company.name} />
      <IntelNav />
      <ScrollView contentContainerStyle={S.content}>
        <View style={S.head}>
          <Link href={`/company/${company.id}`} asChild>
            <SolidButton title="返回公司页" variant="ghost" size="sm" />
          </Link>
          <Text style={S.companyName}>{company.name}</Text>
          <Text style={S.title}>公司评价阅读区</Text>
          <Text style={S.desc}>高赞真实体验、低分体验与风险评价统一按匿名保护规则展示。</Text>
          <Link href="/submit" asChild>
            <SolidButton title="发布评价" style={S.submitButton} />
          </Link>
        </View>

        {reviews.length === 0 ? (
          <SolidCard variant="subtle" style={S.emptyCard}>
            <Text style={S.emptyTitle}>这家公司还没有评价。</Text>
            <Text style={S.emptyDesc}>成为第一个补上这段经历的人。</Text>
          </SolidCard>
        ) : (
          <CompanyReviewFeed companyId={company.id} reviews={reviews} />
        )}
        <AppFooter />
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, gap: 16, paddingBottom: 96 },
  head: { gap: 8 },
  companyName: { fontSize: 13, color: COLORS.muted },
  title: { fontSize: 28, fontWeight: "900", color: COLORS.ink },
  desc: { fontSize: 14, color: COLORS.muted, lineHeight: 22 },
  submitButton: { alignSelf: "flex-start", marginTop: 4 },
  emptyCard: { padding: 18 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  emptyDesc: { marginTop: 6, fontSize: 13, color: COLORS.muted },
})
