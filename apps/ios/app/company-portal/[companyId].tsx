import { useEffect, useMemo, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
} from "react-native"
import { Link, router, useLocalSearchParams } from "expo-router"
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  EyeOff,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Tag as TagIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native"

import { COLORS, RADIUS } from "../../theme"
import { SolidButton } from "../../components/SolidButton"
import { SolidCard } from "../../components/SolidCard"
import { ScoreChip, SolidTopbar, TagPill } from "../../components/SinanPrimitives"
import {
  APPEAL_REASONS,
  CORRECTION_FIELDS,
  listAppealsAsync,
  listCorrectionsAsync,
  submitAppealAsync,
  submitCorrectionAsync,
  type AppealReasonId,
  type CompanyAppeal,
  type CompanyCorrection,
  type CorrectionFieldId,
} from "../../lib/storage"
import { companies, getCompanyReviews } from "../../data"

const CLAIMED = new Set(["northstar-tech", "polaris-auto"])

export default function CompanyPortalDetailScreen() {
  const params = useLocalSearchParams<{ companyId?: string }>()
  const companyId = params.companyId ?? ""
  const company = useMemo(() => companies.find((c) => c.id === companyId), [companyId])
  const reviews = useMemo(
    () => (company ? getCompanyReviews(company.id) : []),
    [company]
  )

  const [corrections, setCorrections] = useState<CompanyCorrection[]>([])
  const [appeals, setAppeals] = useState<CompanyAppeal[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([listCorrectionsAsync(companyId), listAppealsAsync(companyId)]).then(
      ([c, a]) => {
        if (!cancelled) {
          setCorrections(c)
          setAppeals(a)
        }
      }
    )
    return () => {
      cancelled = true
    }
  }, [companyId])

  if (!company) {
    return (
      <View style={S.container}>
        <SolidTopbar title="公司控制台" subtitle="未找到该公司" back />
        <View style={S.emptyWrap}>
          <SolidCard variant="subtle" style={S.emptyCard}>
            <Text style={S.emptyTitle}>没找到这家公司</Text>
            <Text style={S.emptyHint}>公司 ID 不存在,或者已被合并。</Text>
            <Link href="/company-portal" asChild>
              <View style={S.primaryBtn}>
                <Text style={S.primaryText}>返回控制台</Text>
              </View>
            </Link>
          </SolidCard>
        </View>
      </View>
    )
  }

  if (!CLAIMED.has(company.id)) {
    return (
      <View style={S.container}>
        <CompanyPortalBanner />
        <SolidTopbar title="公司控制台" subtitle="未认领" back />
        <View style={S.emptyWrap}>
          <SolidCard variant="subtle" style={S.emptyCard}>
            <Text style={S.emptyTitle}>你还没有认领这家公司</Text>
            <Text style={S.emptyHint}>
              请先通过公司控制台首页提交认领,审核通过后才能进入查看。
            </Text>
            <Link href="/company-portal" asChild>
              <View style={S.primaryBtn}>
                <Text style={S.primaryText}>返回控制台</Text>
              </View>
            </Link>
          </SolidCard>
        </View>
      </View>
    )
  }

  const trend = company.trend
  const trendDelta =
    trend.length >= 2 ? trend[trend.length - 1].score - trend[0].score : 0
  const maxScore = Math.max(...trend.map((p) => p.score), 10)
  const minScore = Math.min(...trend.map((p) => p.score), 0)
  const trendLabel =
    trendDelta >= 0 ? `+${trendDelta.toFixed(1)}` : trendDelta.toFixed(1)

  return (
    <View style={S.container}>
      <CompanyPortalBanner />
      <SolidTopbar
        title={company.shortName}
        subtitle={`${company.industry} · ${company.city}`}
        back
      />
      <ScrollView contentContainerStyle={S.content}>
        <View style={S.headBlock}>
          <Text style={S.heading}>{company.shortName}</Text>
          <Text style={S.headMeta}>
            {company.industry} · {company.city} · {company.size}
          </Text>
          <Text style={S.headSub}>
            这是你在司南上能看到的镜像。所有评价、评分、趋势由匿名打工人贡献,司南不向公司端开放用户身份。
          </Text>
        </View>

        {/* Stat row */}
        <View style={S.statRow}>
          <PortalStatCard
            label="方向分"
            value={company.directionScore.toFixed(1)}
            sub="来自匿名评价"
          />
          <PortalStatCard
            label="推荐入职率"
            value={`${company.recommendationRate}%`}
            sub={`${company.reviewCount.toLocaleString()} 条评价`}
          />
          <PortalStatCard
            label="近 30 天变化"
            value={trendLabel}
            sub={trend.length > 0 ? `数据点 ${trend.length} 个月` : "数据补充中"}
            icon={trendDelta >= 0 ? <TrendingUp size={14} color={COLORS.primaryForeground} /> : <TrendingDown size={14} color={COLORS.riskForeground} />}
          />
          <PortalStatCard
            label="公开评价"
            value={company.reviewCount.toLocaleString()}
            sub="公司端只能查看"
            icon={<EyeOff size={14} color={COLORS.muted} />}
          />
        </View>

        {/* Trend chart */}
        <SolidCard variant="subtle" style={S.section}>
          <View style={S.sectionHead}>
            <Text style={S.sectionTitle}>方向分趋势</Text>
            <Text style={S.sectionMeta}>最近 {trend.length} 个月</Text>
          </View>
          {trend.length === 0 ? (
            <Text style={S.muted}>数据补充中。</Text>
          ) : (
            <View style={S.trendRow} testID="portal-trend-chart">
              {trend.map((point, index) => {
                const ratio = (point.score - minScore) / (maxScore - minScore || 1)
                const heightPx = Math.max(20, Math.round(ratio * 140))
                return (
                  <View key={`${point.month}-${index}`} style={S.trendBar}>
                    <Text style={S.trendValue}>{point.score.toFixed(1)}</Text>
                    <View
                      style={[S.trendBarFill, { height: heightPx }]}
                    />
                    <Text style={S.trendLabel}>{point.month}</Text>
                  </View>
                )
              })}
            </View>
          )}
        </SolidCard>

        {/* Tags + dimensions */}
        <View style={S.twoCol}>
          <SolidCard variant="subtle" style={[S.section, S.twoColItem]}>
            <View style={S.subhead}>
              <TagIcon size={14} color={COLORS.primary} />
              <Text style={S.sectionTitle}>风险标签</Text>
            </View>
            {company.riskTags.length === 0 ? (
              <Text style={S.muted}>暂无风险标签。</Text>
            ) : (
              <View style={S.tagRow}>
                {company.riskTags.map((tag) => (
                  <TagPill
                    key={tag}
                    tone={tag.includes("压力") || tag.includes("波动") ? "risk" : "neutral"}
                  >
                    #{tag}
                  </TagPill>
                ))}
              </View>
            )}
            <Text style={S.footnote}>
              司南自动从公开评价中提取高频风险标签,公司端不能修改或删除。
            </Text>
          </SolidCard>

          <SolidCard variant="subtle" style={[S.section, S.twoColItem]}>
            <Text style={S.sectionTitle}>分维度评分</Text>
            <View style={S.dimList}>
              {company.dimensions.map((dim) => (
                <View key={dim.key} style={S.dimRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={S.dimLabel}>{dim.label}</Text>
                    <Text style={S.dimDesc}>{dim.description}</Text>
                  </View>
                  <Text style={S.dimScore}>{dim.score.toFixed(1)}</Text>
                </View>
              ))}
            </View>
          </SolidCard>
        </View>

        {/* Read-only public reviews */}
        <SolidCard variant="subtle" style={S.section}>
          <View style={S.sectionHead}>
            <Text style={S.sectionTitle}>公开评价(只读)</Text>
            <Text style={S.sectionMeta}>{reviews.length} 条</Text>
          </View>
          <Text style={S.footnote}>
            公司端只能浏览,不能点赞、回复、删改。对内容有异议时,请在每条评价上点击「提交申诉」。
          </Text>
          <View style={S.reviewList} testID="portal-reviews-list">
            {reviews.slice(0, 6).map((review) => {
              const reviewAppeals = appeals.filter((a) => a.reviewId === review.id)
              return (
                <View key={review.id} style={S.reviewItem} testID={`portal-review-${review.id}`}>
                  <View style={S.reviewHead}>
                    <Text style={S.reviewTitle} numberOfLines={1}>
                      {review.title}
                    </Text>
                    <View style={S.scorePill}>
                      <Text style={S.scorePillText}>{review.directionScore} 分</Text>
                    </View>
                  </View>
                  <Text style={S.reviewBody} numberOfLines={3}>
                    {review.content}
                  </Text>
                  <Text style={S.muted}>
                    {review.employmentStatus} · {review.authorRole} · {review.city}
                  </Text>
                  <View style={S.reviewFooter}>
                    {reviewAppeals.length > 0 ? (
                      <View style={S.appealedPill}>
                        <ShieldAlert size={12} color={COLORS.riskForeground} />
                        <Text style={S.appealedText}>
                          已申诉 {reviewAppeals.length} 次
                        </Text>
                      </View>
                    ) : (
                      <View />
                    )}
                    <AppealButton companyId={company.id} reviewId={review.id} />
                  </View>
                </View>
              )
            })}
          </View>
        </SolidCard>

        {/* Submission queue: company info corrections */}
        <SolidCard variant="subtle" style={S.section}>
          <View style={S.sectionHead}>
            <Text style={S.sectionTitle}>公司信息修正</Text>
            <Text style={S.sectionMeta}>{corrections.length} 条提交</Text>
          </View>
          <Text style={S.footnote}>
            这里是你提交过的工商信息修正申请。司南审核通过后会在公开页更新。
          </Text>
          <CorrectionForm
            company={company}
            onSubmitted={(c) => setCorrections([c, ...corrections])}
          />
          {corrections.length > 0 ? (
            <View style={S.correctionList}>
              {corrections.slice(0, 5).map((correction) => (
                <View key={correction.id} style={S.correctionItem}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={S.correctionLabel}>
                      {CORRECTION_FIELDS.find((f) => f.value === correction.field)?.label ??
                        correction.field}
                    </Text>
                    <Text style={S.correctionMeta}>
                      <Text style={{ textDecorationLine: "line-through" }}>
                        {correction.currentValue || "(空)"}
                      </Text>{" "}
                      →{" "}
                      <Text style={S.correctionProposed}>
                        {correction.proposedValue}
                      </Text>
                    </Text>
                    {correction.reason ? (
                      <Text style={S.muted}>说明:{correction.reason}</Text>
                    ) : null}
                  </View>
                  <View style={S.pendingPill}>
                    <Clock size={12} color={COLORS.primaryForeground} />
                    <Text style={S.pendingText}>审核中</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </SolidCard>

        {/* Public link */}
        <View style={S.publicLinkCard}>
          <Text style={S.publicLinkText}>
            想看公开镜像(打工人视角)?点
            <Link href={`/company/${company.id}`} asChild>
              <Text style={S.publicLinkAction}> 公开页 </Text>
            </Link>
            查看。
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

function PortalStatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: string
  sub: string
  icon?: React.ReactNode
}) {
  return (
    <SolidCard variant="subtle" style={S.statCard}>
      <View style={S.statHead}>
        <View style={S.statIcon}>{icon ?? <Lock size={12} color={COLORS.muted} />}</View>
        <Text style={S.statLabel}>{label}</Text>
      </View>
      <Text style={S.statValue}>{value}</Text>
      <Text style={S.statSub}>{sub}</Text>
    </SolidCard>
  )
}

function CorrectionForm({
  company,
  onSubmitted,
}: {
  company: { id: string; name: string; industry: string; city: string; size: string; stage: string }
  onSubmitted: (c: CompanyCorrection) => void
}) {
  const [field, setField] = useState<CorrectionFieldId>("name")
  const [proposed, setProposed] = useState("")
  const [reason, setReason] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const currentValue = useMemo(() => {
    if (field === "name") return company.name
    if (field === "industry") return company.industry
    if (field === "city") return company.city
    if (field === "size") return company.size
    if (field === "stage") return company.stage
    return ""
  }, [field, company])

  async function handleSubmit() {
    if (!proposed.trim()) return
    const correction = await submitCorrectionAsync({
      companyId: company.id,
      field,
      currentValue,
      proposedValue: proposed.trim(),
      reason: reason.trim(),
    })
    onSubmitted(correction)
    setSubmitted(true)
    setProposed("")
    setReason("")
    setTimeout(() => setSubmitted(false), 2500)
  }

  return (
    <View style={S.correctionForm}>
      <TouchableOpacity
        onPress={() => setPickerOpen(true)}
        activeOpacity={0.85}
        style={S.fieldPicker}
      >
        <View>
          <Text style={S.fieldLabel}>修正字段</Text>
          <Text style={S.fieldValue}>
            {CORRECTION_FIELDS.find((f) => f.value === field)?.label}
          </Text>
          <Text style={S.fieldDesc}>
            {CORRECTION_FIELDS.find((f) => f.value === field)?.description}
          </Text>
        </View>
        <ChevronDown size={16} color={COLORS.muted} />
      </TouchableOpacity>
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={S.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={S.sheet} onPress={() => undefined}>
            <View style={S.sheetHandle} />
            <Text style={S.sheetTitle}>选择字段</Text>
            <ScrollView>
              {CORRECTION_FIELDS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  activeOpacity={0.85}
                  onPress={() => {
                    setField(opt.value)
                    setPickerOpen(false)
                  }}
                  style={[S.optionRow, field === opt.value && S.optionRowSelected]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={S.optionLabel}>{opt.label}</Text>
                    <Text style={S.optionDesc}>{opt.description}</Text>
                  </View>
                  {field === opt.value ? <CheckCircle2 size={16} color={COLORS.primary} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <View style={S.fieldInputBlock}>
        <Text style={S.fieldLabel}>建议值</Text>
        <TextInput
          value={proposed}
          onChangeText={setProposed}
          placeholder="例如:北辰智造科技(上海)有限公司"
          placeholderTextColor={COLORS.mutedLight}
          style={S.fieldInput}
        />
        <Text style={S.fieldDesc}>当前:{currentValue || "(空)"}</Text>
      </View>
      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder="修正原因(选填,提供证据链接/截图说明更易通过)"
        placeholderTextColor={COLORS.mutedLight}
        multiline
        style={S.reasonInput}
      />
      <View style={S.formActions}>
        {submitted ? (
          <View style={S.submittedHint}>
            <CheckCircle2 size={14} color={COLORS.primaryForeground} />
            <Text style={S.submittedText}>已提交,等待审核</Text>
          </View>
        ) : null}
        <SolidButton
          title="提交修正"
          variant="primary"
          size="sm"
          onPress={handleSubmit}
        />
      </View>
    </View>
  )
}

function AppealButton({ companyId, reviewId }: { companyId: string; reviewId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<AppealReasonId | "">("")
  const [note, setNote] = useState("")
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit() {
    if (!reason) return
    await submitAppealAsync({ companyId, reviewId, reason, note })
    setSubmitted(true)
    setOpen(false)
    setReason("")
    setNote("")
  }

  if (submitted) {
    return (
      <View style={S.appealedPill}>
        <CheckCircle2 size={12} color={COLORS.primaryForeground} />
        <Text style={S.appealedText}>申诉已提交</Text>
      </View>
    )
  }

  if (!open) {
    return (
      <SolidButton
        title="提交申诉"
        variant="secondary"
        size="sm"
        onPress={() => setOpen(true)}
        testID={`appeal-button-${reviewId}`}
      />
    )
  }

  return (
    <View style={S.appealForm}>
      <Text style={S.appealTitle}>对这条评价提交申诉</Text>
      <ScrollView style={S.appealList} contentContainerStyle={S.appealListContent}>
        {APPEAL_REASONS.map((option) => {
          const selected = reason === option.id
          return (
            <TouchableOpacity
              key={option.id}
              activeOpacity={0.85}
              onPress={() => setReason(option.id)}
              style={[S.appealOption, selected && S.appealOptionSelected]}
              testID={`appeal-reason-${reviewId}-${option.id}`}
            >
              <Text style={[S.appealOptionText, selected && S.appealOptionTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="补充说明 / 举证(选填)"
        placeholderTextColor={COLORS.mutedLight}
        multiline
        style={S.reasonInput}
      />
      <View style={S.formActions}>
        <SolidButton
          title="取消"
          variant="ghost"
          size="sm"
          onPress={() => setOpen(false)}
        />
        <SolidButton
          title="提交"
          variant="primary"
          size="sm"
          onPress={handleSubmit}
          testID={`appeal-submit-${reviewId}`}
        />
      </View>
    </View>
  )
}

function CompanyPortalBanner() {
  return (
    <View style={S.banner}>
      <View style={S.bannerInner}>
        <View style={S.bannerLeft}>
          <Building2 size={14} color="#FFFFFF" />
          <Text style={S.bannerTitle}>公司控制台</Text>
          <Text style={S.bannerSub}>· 你正在以公司身份查看</Text>
        </View>
        <View style={S.bannerRight}>
          <ShieldCheck size={12} color="rgba(255,255,255,0.7)" />
          <Text style={S.bannerRightText}>匿名保护</Text>
        </View>
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  banner: { backgroundColor: COLORS.dark, paddingVertical: 10 },
  bannerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  bannerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  bannerTitle: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
  bannerSub: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  bannerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  bannerRightText: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  headBlock: { gap: 6 },
  heading: { fontSize: 22, fontWeight: "800", color: COLORS.ink },
  headMeta: { fontSize: 12, color: COLORS.muted },
  headSub: { fontSize: 13, lineHeight: 20, color: COLORS.textSecondary, marginTop: 4 },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    flex: 1,
    minWidth: "47%",
    padding: 14,
    gap: 4,
  },
  statHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  statIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceHover,
  },
  statLabel: { fontSize: 12, color: COLORS.muted },
  statValue: { fontSize: 22, fontWeight: "800", color: COLORS.ink, marginTop: 4 },
  statSub: { fontSize: 11, color: COLORS.mutedLight },
  section: { padding: 16, gap: 12 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: COLORS.ink },
  sectionMeta: { fontSize: 12, color: COLORS.muted },
  subhead: { flexDirection: "row", alignItems: "center", gap: 6 },
  twoCol: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  twoColItem: { flex: 1, minWidth: "100%" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dimList: { gap: 10 },
  dimRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dimLabel: { fontSize: 13, fontWeight: "800", color: COLORS.ink },
  dimDesc: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  dimScore: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  trendRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 180 },
  trendBar: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  trendValue: { fontSize: 11, fontWeight: "800", color: COLORS.ink },
  trendBarFill: {
    width: "100%",
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  trendLabel: { fontSize: 11, color: COLORS.muted },
  reviewList: { gap: 10 },
  reviewItem: {
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: `${COLORS.border}99`,
    backgroundColor: COLORS.surfaceMuted,
    gap: 6,
  },
  reviewHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  reviewTitle: { flex: 1, fontSize: 13, fontWeight: "800", color: COLORS.ink },
  scorePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  scorePillText: { fontSize: 12, fontWeight: "800", color: COLORS.ink },
  reviewBody: { fontSize: 13, lineHeight: 20, color: COLORS.textSecondary },
  reviewFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 4,
  },
  appealedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.riskSoft,
  },
  appealedText: { fontSize: 11, fontWeight: "800", color: COLORS.riskForeground },
  pendingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
  },
  pendingText: { fontSize: 11, fontWeight: "800", color: COLORS.primaryForeground },
  correctionForm: { gap: 10 },
  fieldPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
  },
  fieldInputBlock: { gap: 4 },
  fieldInput: {
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    fontSize: 13,
    color: COLORS.ink,
  },
  fieldLabel: { fontSize: 11, color: COLORS.muted, fontWeight: "700" },
  fieldValue: { fontSize: 14, color: COLORS.ink, fontWeight: "800", marginTop: 2 },
  fieldDesc: { fontSize: 11, color: COLORS.mutedLight, marginTop: 2 },
  reasonInput: {
    minHeight: 56,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    fontSize: 13,
    color: COLORS.ink,
    textAlignVertical: "top",
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  submittedHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: "auto",
  },
  submittedText: { fontSize: 12, color: COLORS.primaryForeground, fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: "rgba(17,24,39,0.32)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: RADIUS["2xl"],
    borderTopRightRadius: RADIUS["2xl"],
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: "70%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: COLORS.ink, marginBottom: 12 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: RADIUS.md,
  },
  optionRowSelected: { backgroundColor: COLORS.primarySoft },
  optionLabel: { fontSize: 14, fontWeight: "700", color: COLORS.ink },
  optionDesc: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  correctionList: { gap: 8 },
  correctionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
  },
  correctionLabel: { fontSize: 13, fontWeight: "800", color: COLORS.ink },
  correctionMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  correctionProposed: { fontWeight: "800", color: COLORS.ink },
  appealForm: {
    marginTop: 4,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  appealTitle: { fontSize: 13, fontWeight: "800", color: COLORS.ink },
  appealList: { flexGrow: 0, maxHeight: 220 },
  appealListContent: { gap: 6 },
  appealOption: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
  },
  appealOptionSelected: { borderColor: COLORS.risk, backgroundColor: COLORS.riskSoft },
  appealOptionText: { fontSize: 12, color: COLORS.textSecondary },
  appealOptionTextSelected: { color: COLORS.riskForeground, fontWeight: "800" },
  publicLinkCard: {
    padding: 14,
    borderRadius: RADIUS.md,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: `${COLORS.border}99`,
  },
  publicLinkText: { fontSize: 12, color: COLORS.muted, lineHeight: 18 },
  publicLinkAction: { fontSize: 12, color: COLORS.primary, fontWeight: "800" },
  emptyWrap: { flex: 1, padding: 24, justifyContent: "center" },
  emptyCard: { padding: 24, gap: 10, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  emptyHint: { fontSize: 13, color: COLORS.muted, lineHeight: 20, textAlign: "center" },
  primaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  primaryText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  muted: { fontSize: 12, color: COLORS.muted, lineHeight: 18 },
  footnote: { fontSize: 11, color: COLORS.muted, lineHeight: 18 },
})
