import { useMemo, useState } from "react"
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { Link, useLocalSearchParams } from "expo-router"
import { getCompany, getCompanyReviews } from "../../../data"
import { COLORS, RADIUS } from "../../../theme"
import { MobileReviewCard } from "../../../components/MobileReviewCard"
import { AppFooter, IntelNav } from "../../../components/AppShellBits"
import { SolidButton } from "../../../components/SolidButton"
import { SolidCard } from "../../../components/SolidCard"
import { SolidInput } from "../../../components/SolidInput"
import { ScoreChip, SolidTopbar, TagPill } from "../../../components/SinanPrimitives"

const scoreOptions = Array.from({ length: 11 }, (_, index) => index)

function explainScore(score: number) {
  if (score >= 9) return "强烈推荐，较少明显风险"
  if (score >= 8) return "整体较好，适合重点考虑"
  if (score >= 7) return "可以考虑，但要看具体岗位"
  if (score >= 6) return "机会与风险并存"
  if (score >= 5) return "不确定性较高"
  if (score >= 4) return "风险较明显"
  return "高风险，建议谨慎"
}

export default function CompanyRatingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const company = getCompany(id ?? "")
  const reviews = getCompanyReviews(company.id)
  const [score, setScore] = useState<number | null>(null)
  const [note, setNote] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const displayedScore = score ?? company.directionScore
  const maxDistribution = useMemo(
    () => Math.max(...company.scoreDistribution.map((item) => item.count), 1),
    [company.scoreDistribution]
  )

  return (
    <View style={S.container}>
      <SolidTopbar back title="真实评价" subtitle={company.name} />
      <IntelNav />
      <ScrollView contentContainerStyle={S.content}>
        <SolidCard variant="default" style={S.hero}>
          <View style={S.heroTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={S.companyName}>{company.name}</Text>
              <Text style={S.title}>真实评价</Text>
              <Text style={S.desc}>这里优先展示这家公司下面的匿名体验。方向分只是辅助判断，真正有用的信息在评论里。</Text>
              <View style={S.tags}>
                <TagPill tone="positive">公司体感 {company.vibe}</TagPill>
                {company.riskTags.map((tag) => (
                  <TagPill key={tag} tone={tag.includes("压力") || tag.includes("波动") ? "risk" : "neutral"}>
                    {tag}
                  </TagPill>
                ))}
              </View>
            </View>
            <View style={S.heroStats}>
              <View>
                <Text style={S.statLabel}>方向分</Text>
                <Text style={S.statValue}>{company.directionScore.toFixed(1)}</Text>
              </View>
              <View style={S.statDivider} />
              <View>
                <Text style={S.statLabel}>真实体验</Text>
                <Text style={S.statValue}>{company.reviewCount.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        </SolidCard>

        <SolidCard variant="subtle" style={S.insightCard}>
          <Text style={S.sectionTitle}>评分维度</Text>
          <View style={S.dimensionList}>
            {company.dimensions.map((dimension) => (
              <View key={dimension.key} style={S.dimensionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={S.dimensionLabel}>{dimension.label}</Text>
                  <Text style={S.dimensionDesc}>{dimension.description}</Text>
                  <View style={S.track}>
                    <View style={[S.trackFill, { width: `${dimension.score * 10}%` }]} />
                  </View>
                </View>
                <ScoreChip score={dimension.score.toFixed(1)} compact />
              </View>
            ))}
          </View>
        </SolidCard>

        <SolidCard variant="subtle" style={S.insightCard}>
          <Text style={S.sectionTitle}>评分分布</Text>
          {company.scoreDistribution.map((item) => (
            <View key={item.score} style={S.distributionRow}>
              <Text style={S.bucket}>{item.score}</Text>
              <View style={S.distributionTrack}>
                <View style={[S.distributionFill, { width: `${(item.count / maxDistribution) * 100}%` }]} />
              </View>
              <Text style={S.count}>{item.count}</Text>
            </View>
          ))}
        </SolidCard>

        <SolidCard variant="subtle" style={S.ratingCard}>
          <Text style={S.sectionTitle}>给这家公司打个方向分</Text>
          <Text style={S.desc}>可选。提交后只在本地模拟成功状态。</Text>
          <View style={S.scoreGrid}>
            {scoreOptions.map((item) => (
              <TouchableOpacity
                key={item}
                activeOpacity={0.76}
                onPress={() => setScore(item)}
                style={[S.scoreButton, score === item && S.scoreButtonActive]}
              >
                <Text style={[S.scoreButtonText, score === item && S.scoreButtonTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={S.preview}>
            <Text style={S.previewLabel}>你的方向分</Text>
            <Text style={S.previewScore}>{displayedScore.toFixed(1)}</Text>
            <Text style={S.previewDesc}>{explainScore(displayedScore)}</Text>
          </View>
          {score !== null ? (
            <View style={S.noteBlock}>
              <SolidInput
                value={note}
                maxLength={80}
                onChangeText={setNote}
                placeholder="一句话补充：写事实，不写可识别个人身份的信息。"
                multiline
                style={S.noteInput}
              />
              <Text style={S.noteCount}>{note.length}/80</Text>
            </View>
          ) : null}
          <View style={S.safetyBox}>
            <Text style={S.safetyText}>提交前请确认没有姓名、工号、手机号、住址等个人身份信息。</Text>
          </View>
          <SolidButton title="提交方向分" onPress={() => setSubmitted(true)} />
          <Link href="/submit" asChild>
            <SolidButton title="写完整评价" variant="secondary" />
          </Link>
          {submitted ? (
            <View style={S.reward}>
              <Text style={S.rewardTitle}>你为后来者点亮了一次方向</Text>
              <Text style={S.rewardText}>方向值 +20 · 连续点灯 +1</Text>
              <Text style={S.rewardFine}>评价等待审核中</Text>
            </View>
          ) : null}
        </SolidCard>

        {reviews.length === 0 ? (
          <SolidCard variant="subtle" style={S.insightCard}>
            <Text style={S.sectionTitle}>暂无评价</Text>
            <Text style={S.desc}>成为第一个补上这段经历的人。</Text>
          </SolidCard>
        ) : (
          <View style={S.reviewList}>
            {reviews.map((review) => (
              <MobileReviewCard key={review.id} review={review} companyId={company.id} />
            ))}
          </View>
        )}
        <AppFooter />
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, gap: 16, paddingBottom: 96 },
  hero: { padding: 18 },
  heroTop: { gap: 16 },
  companyName: { fontSize: 13, color: COLORS.muted },
  title: { fontSize: 28, fontWeight: "900", color: COLORS.ink, marginTop: 3 },
  desc: { fontSize: 14, color: COLORS.muted, lineHeight: 22, marginTop: 8 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  heroStats: {
    borderRadius: RADIUS["2xl"],
    backgroundColor: COLORS.surfaceHover,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  statLabel: { fontSize: 12, color: COLORS.muted },
  statValue: { fontSize: 24, fontWeight: "900", color: COLORS.ink, marginTop: 3 },
  statDivider: { width: 1, height: 34, backgroundColor: COLORS.border },
  insightCard: { padding: 18 },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: COLORS.ink },
  dimensionList: { gap: 14, marginTop: 14 },
  dimensionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dimensionLabel: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  dimensionDesc: { fontSize: 12, color: COLORS.muted, lineHeight: 18, marginTop: 2 },
  track: { height: 7, borderRadius: 999, backgroundColor: COLORS.surfaceHover, overflow: "hidden", marginTop: 8 },
  trackFill: { height: "100%", borderRadius: 999, backgroundColor: COLORS.primary },
  distributionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  bucket: { width: 38, fontSize: 12, fontWeight: "800", color: COLORS.inkSoft },
  distributionTrack: { flex: 1, height: 9, borderRadius: 999, backgroundColor: COLORS.surfaceHover, overflow: "hidden" },
  distributionFill: { height: "100%", borderRadius: 999, backgroundColor: COLORS.dark },
  count: { width: 42, textAlign: "right", fontSize: 12, color: COLORS.muted },
  ratingCard: { padding: 18, gap: 14 },
  scoreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scoreButton: {
    width: 42,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceHover,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreButtonActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  scoreButtonText: { fontSize: 13, fontWeight: "800", color: COLORS.inkSoft },
  scoreButtonTextActive: { color: "#FFFFFF" },
  preview: { borderRadius: RADIUS["2xl"], backgroundColor: COLORS.surfaceHover, padding: 14 },
  previewLabel: { fontSize: 12, color: COLORS.muted },
  previewScore: { fontSize: 28, fontWeight: "900", color: COLORS.ink, marginTop: 4 },
  previewDesc: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  noteBlock: { gap: 6 },
  noteInput: { minHeight: 88, textAlignVertical: "top" },
  noteCount: { textAlign: "right", fontSize: 12, color: COLORS.muted },
  safetyBox: { borderRadius: RADIUS["2xl"], backgroundColor: COLORS.riskSoft, padding: 14 },
  safetyText: { fontSize: 13, color: COLORS.riskForeground, lineHeight: 20 },
  reward: { borderRadius: RADIUS["2xl"], backgroundColor: COLORS.primarySoft, padding: 14 },
  rewardTitle: { fontSize: 14, fontWeight: "800", color: COLORS.primaryForeground },
  rewardText: { fontSize: 13, color: COLORS.primaryForeground, marginTop: 5 },
  rewardFine: { fontSize: 12, color: COLORS.primaryForeground, marginTop: 5 },
  reviewList: { gap: 12 },
})
