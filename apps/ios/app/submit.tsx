import { useMemo, useState } from "react"
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { COLORS, RADIUS, SHADOWS } from "../theme"
import { companies, searchCompanies, type MobileCompany } from "../data"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"
import { SolidInput } from "../components/SolidInput"
import { MetricPill, SolidTopbar, TagPill } from "../components/SinanPrimitives"

const steps = [
  { title: "选择公司", description: "先选择公司，找不到可以直接新增" },
  { title: "方向评分", description: "给后来者一个 0-10 的方向判断" },
  { title: "真实体验", description: "写事实、写风险、先做匿名安全检查" },
] as const

const relations = ["在职员工", "离职员工", "面试者", "实习生", "外包 / 派遣"] as const

export default function SubmitScreen() {
  const params = useLocalSearchParams<{ companyId?: string; companyName?: string; mode?: string; name?: string }>()
  const addCompanyMode = params.mode === "add-company"
  const initialCompany = companies.find((company) => company.id === params.companyId) ?? companies[0]
  const initialQuery = params.name ?? params.companyName ?? (addCompanyMode ? "" : initialCompany.name)

  const [step, setStep] = useState(0)
  const [companyQuery, setCompanyQuery] = useState(initialQuery)
  const [selectedCompany, setSelectedCompany] = useState<MobileCompany | null>(addCompanyMode ? null : initialCompany)
  const [addingCompany, setAddingCompany] = useState(addCompanyMode)
  const [newCompanyCity, setNewCompanyCity] = useState("")
  const [newCompanyIndustry, setNewCompanyIndustry] = useState("")
  const [role, setRole] = useState("")
  const [relation, setRelation] = useState<(typeof relations)[number]>("离职员工")
  const [directionScore, setDirectionScore] = useState(7)
  const [interviewDifficulty, setInterviewDifficulty] = useState(5)
  const [salaryRange, setSalaryRange] = useState("")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [safetyChecked, setSafetyChecked] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const matchedCompanies = useMemo(() => searchCompanies(companyQuery).slice(0, 4), [companyQuery])
  const progress = Math.round(((step + 1) / steps.length) * 100)
  const completion = Math.round(
    ([selectedCompany, role, relation, title, content, directionScore, safetyChecked].filter(Boolean).length / 7) * 100
  )

  function selectCompany(company: MobileCompany) {
    setSelectedCompany(company)
    setCompanyQuery(company.name)
    setAddingCompany(false)
  }

  function saveNewCompany() {
    const name = companyQuery.trim()
    if (!name || !newCompanyCity.trim() || !newCompanyIndustry.trim()) return
    setSelectedCompany({
      ...companies[0],
      id: `company-custom-${Date.now()}`,
      name,
      shortName: name.slice(0, 8),
      city: newCompanyCity.trim(),
      industry: newCompanyIndustry.trim(),
      size: "规模待补充",
      stage: "待审核",
      reviewCount: 0,
      recentReviewCount: 0,
      directionScore: 0,
      recommendationRate: 0,
      salaryRange: "待补充",
      highlights: ["公司信息待审核"],
      riskTags: ["待审核"],
      vibe: "待审核",
      roles: [],
    })
    setAddingCompany(false)
  }

  function canGoNext() {
    if (step === 0) return Boolean(selectedCompany && role.trim())
    if (step === 1) return true
    return Boolean(title.trim().length >= 6 && content.trim().length >= 30 && safetyChecked)
  }

  if (submitted) {
    return (
      <ScrollView style={S.container} contentContainerStyle={S.successWrap}>
        <SolidCard variant="elevated" style={S.successCard}>
          <View style={S.successIcon}><Text style={S.successIconText}>+20</Text></View>
          <Text style={S.successTitle}>评价已进入匿名预览</Text>
          <Text style={S.successText}>
            你的评价会在审核后展示。正式版本会先完成匿名保护和真实性校验，再进入公开样本。
          </Text>
          <View style={S.rewardGrid}>
            {["方向值 +20", "连续点灯 +1", "司南徽章进度 +1"].map((item) => (
              <View key={item} style={S.rewardPill}>
                <Text style={S.rewardText}>{item}</Text>
              </View>
            ))}
          </View>
          <SolidButton title="返回推荐" variant="primary" size="lg" onPress={() => router.push("/")} style={{ marginTop: 18 }} />
        </SolidCard>

        <SolidCard variant="subtle" style={S.verifyCard}>
          <Text style={S.sectionTitle}>匿名真实性校验</Text>
          <Text style={S.helperText}>你可以继续补充身份凭证。凭证只用于匿名校验，不向公司开放。</Text>
          <SolidButton title="稍后补充" variant="secondary" size="sm" style={{ alignSelf: "flex-start", marginTop: 12 }} />
        </SolidCard>
      </ScrollView>
    )
  }

  return (
    <ScrollView style={S.container} contentContainerStyle={S.content}>
      <SolidTopbar back title={addCompanyMode ? "添加未收录公司" : "发布评价"} subtitle="三步完成匿名评价，优先写事实和流程" />

      <SolidCard variant="subtle" style={S.questionnaireCard}>
        <Text style={S.sectionTitle}>补充办公体验问卷</Text>
        <Text style={S.helperText}>约 30 秒，可跳过。每次只问一个问题。</Text>
        <Text style={S.optionalText}>办公体验，可选</Text>
        <View style={S.inlineButtons}>
          <SolidButton title="开始答题" variant="primary" size="sm" />
          <SolidButton title="跳过" variant="secondary" size="sm" />
        </View>
      </SolidCard>

      <SolidCard variant="default" style={S.formCard}>
        <View style={S.formHead}>
          <View style={{ flex: 1 }}>
            <Text style={S.formTitle}>{steps[step].title}</Text>
            <Text style={S.helperText}>{steps[step].description}</Text>
          </View>
          <Text style={S.stepCount}>第 {step + 1} 步 / 共 {steps.length} 步</Text>
        </View>
        <View style={S.progressTrack}>
          <View style={[S.progressFill, { width: `${progress}%` }]} />
        </View>

        {step === 0 ? (
          <View style={S.stepBody}>
            <Text style={S.label}>搜索公司 *</Text>
            <SolidInput
              value={companyQuery}
              onChangeText={(value) => {
                setCompanyQuery(value)
                if (selectedCompany?.name !== value) setSelectedCompany(null)
              }}
              placeholder="输入公司名称"
              style={S.input}
            />

            {!addingCompany ? (
              <View style={S.companyOptions}>
                {matchedCompanies.map((company) => (
                  <SolidButton
                    key={company.id}
                    title={`${company.name} · ${company.industry} · ${company.city}`}
                    variant={selectedCompany?.id === company.id ? "dark" : "secondary"}
                    size="sm"
                    onPress={() => selectCompany(company)}
                    style={S.fullButton}
                    textStyle={S.optionButtonText}
                  />
                ))}
              </View>
            ) : null}

            {!selectedCompany && !addingCompany && companyQuery.trim().length >= 2 ? (
              <SolidCard variant="subtle" style={S.noResultCard}>
                <Text style={S.noResultTitle}>还没有这家公司</Text>
                <Text style={S.helperText}>你可以提交公司注册信息，审核通过后开放评价。</Text>
                <SolidButton title="添加未收录公司" size="sm" onPress={() => setAddingCompany(true)} style={{ alignSelf: "flex-start", marginTop: 10 }} />
              </SolidCard>
            ) : null}

            {addingCompany ? (
              <SolidCard variant="subtle" style={S.addCompanyCard}>
                <Text style={S.sectionTitle}>添加未收录公司</Text>
                <Text style={S.helperText}>请补充基础信息。审核通过前，该公司不会开放正式评价。</Text>
                <SolidInput value={companyQuery} onChangeText={setCompanyQuery} placeholder="完整公司名称 *" style={S.input} />
                <SolidInput value={newCompanyCity} onChangeText={setNewCompanyCity} placeholder="注册城市 *" style={S.input} />
                <SolidInput value={newCompanyIndustry} onChangeText={setNewCompanyIndustry} placeholder="所属行业 *" style={S.input} />
                <View style={S.inlineButtons}>
                  <SolidButton title="提交公司信息" onPress={saveNewCompany} disabled={!companyQuery.trim() || !newCompanyCity.trim() || !newCompanyIndustry.trim()} />
                  <SolidButton title="取消" variant="ghost" onPress={() => setAddingCompany(false)} />
                </View>
              </SolidCard>
            ) : null}

            {selectedCompany ? (
              <View style={S.selectedPill}>
                <Text style={S.selectedText}>
                  {selectedCompany.name} · {selectedCompany.city} · {selectedCompany.industry}
                </Text>
                {selectedCompany.stage === "待审核" ? <Text style={S.pendingText}>当前状态：待审核</Text> : null}
              </View>
            ) : null}

            <Text style={S.label}>岗位 *</Text>
            <SolidInput value={role} onChangeText={setRole} placeholder="例如：前端工程师" style={S.input} />

            <Text style={S.label}>身份关系 *</Text>
            <View style={S.chipWrap}>
              {relations.map((item) => (
                <SolidButton
                  key={item}
                  title={item}
                  variant={relation === item ? "dark" : "secondary"}
                  size="sm"
                  onPress={() => setRelation(item)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={S.stepBody}>
            <ScoreSelector title="方向分" description="结合成长、管理、负荷、薪资兑现与尊重边界给出综合判断。" value={directionScore} onChange={setDirectionScore} />
            <ScoreSelector title="面试难度" description="0 代表轻松，10 代表高强度或流程复杂。" value={interviewDifficulty} onChange={setInterviewDifficulty} />
            <Text style={S.label}>薪资区间</Text>
            <SolidInput value={salaryRange} onChangeText={setSalaryRange} placeholder="例如：25k-42k x 14，可选" style={S.input} />
            <View style={S.scoreHints}>
              <MetricPill label="方向分" value={directionScore.toFixed(1)} />
              <MetricPill label="面试难度" value={interviewDifficulty.toFixed(1)} />
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={S.stepBody}>
            <Text style={S.label}>评价标题 *</Text>
            <SolidInput value={title} onChangeText={setTitle} placeholder="至少 6 个字，例如：流程偏重，但确定性不错" style={S.input} />
            <Text style={S.label}>真实体验 *</Text>
            <SolidInput
              value={content}
              onChangeText={setContent}
              placeholder="评价至少 30 个字。建议写事实、流程、风险和你会问候选人的问题。"
              multiline
              style={[S.input, S.textarea]}
            />
            <TouchableOpacity activeOpacity={0.75} onPress={() => setSafetyChecked((value) => !value)} style={S.safetyRow}>
              <View style={[S.checkbox, safetyChecked && S.checkboxActive]}>
                {safetyChecked ? <Text style={S.checkboxText}>✓</Text> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.safetyTitle}>匿名安全检查</Text>
                <Text style={S.helperText}>我已移除姓名、手机号、工号、截图水印等可识别信息。</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={S.navRow}>
          <SolidButton title="上一步" variant="secondary" disabled={step === 0} onPress={() => setStep((value) => Math.max(0, value - 1))} />
          <SolidButton
            title={step === steps.length - 1 ? "提交评价" : "下一步"}
            disabled={!canGoNext()}
            onPress={() => {
              if (step === steps.length - 1) setSubmitted(true)
              else setStep((value) => Math.min(steps.length - 1, value + 1))
            }}
          />
        </View>
      </SolidCard>

      <SolidCard variant="subtle" style={S.sideCard}>
        <Text style={S.sectionTitle}>填写完成度</Text>
        <View style={S.progressTrack}>
          <View style={[S.progressFill, { width: `${completion}%` }]} />
        </View>
        <Text style={S.helperText}>已完成 {completion}% · 事实越具体，越能帮助后来者判断。</Text>
        <View style={S.tags}>
          <TagPill tone="positive">匿名保护</TagPill>
          <TagPill tone="neutral">事实优先</TagPill>
          <TagPill tone="risk">避免攻击性表达</TagPill>
        </View>
      </SolidCard>
    </ScrollView>
  )
}

function ScoreSelector({
  title,
  description,
  value,
  onChange,
}: {
  title: string
  description: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <View style={S.scoreBlock}>
      <View>
        <Text style={S.label}>{title}</Text>
        <Text style={S.helperText}>{description}</Text>
      </View>
      <Text style={S.bigScore}>{value.toFixed(1)}</Text>
      <View style={S.scoreGrid}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
          <TouchableOpacity key={item} activeOpacity={0.75} onPress={() => onChange(item)} style={[S.scoreButton, value === item && S.scoreButtonActive]}>
            <Text style={[S.scoreButtonText, value === item && S.scoreButtonTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 96 },
  questionnaireCard: { margin: 16, marginBottom: 0, padding: 16 },
  formCard: { margin: 16, padding: 16 },
  formHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  formTitle: { fontSize: 20, fontWeight: "800", color: COLORS.ink },
  stepCount: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: COLORS.surfaceHover, overflow: "hidden", marginTop: 14 },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: COLORS.primary },
  stepBody: { gap: 12, marginTop: 18 },
  label: { fontSize: 14, fontWeight: "800", color: COLORS.inkSoft },
  input: { backgroundColor: COLORS.surface, borderColor: COLORS.borderSoft, ...SHADOWS.cardSubtle },
  textarea: { minHeight: 150, textAlignVertical: "top" },
  companyOptions: { gap: 8, marginTop: 2 },
  fullButton: { justifyContent: "flex-start", minHeight: 38 },
  optionButtonText: { flexShrink: 1, textAlign: "left" },
  noResultCard: { padding: 14 },
  noResultTitle: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  addCompanyCard: { gap: 10, padding: 14 },
  selectedPill: { borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceHover, padding: 12 },
  selectedText: { fontSize: 13, fontWeight: "700", color: COLORS.inkSoft },
  pendingText: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  inlineButtons: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  optionalText: { fontSize: 12, color: COLORS.muted, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  helperText: { fontSize: 13, color: COLORS.muted, lineHeight: 20, marginTop: 4 },
  scoreBlock: { gap: 12 },
  bigScore: { fontSize: 54, fontWeight: "900", color: COLORS.primary, textAlign: "center" },
  scoreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scoreButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceHover,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreButtonActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  scoreButtonText: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  scoreButtonTextActive: { color: "#FFFFFF" },
  scoreHints: { flexDirection: "row", gap: 8 },
  safetyRow: {
    flexDirection: "row",
    gap: 12,
    borderRadius: RADIUS["2xl"],
    backgroundColor: COLORS.surfaceHover,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkboxText: { color: "#FFFFFF", fontWeight: "900" },
  safetyTitle: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  navRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 18 },
  sideCard: { marginHorizontal: 16, padding: 16 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  successWrap: { padding: 16, paddingTop: 48, paddingBottom: 96 },
  successCard: { padding: 22 },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  successIconText: { fontSize: 16, fontWeight: "900", color: COLORS.primaryForeground },
  successTitle: { fontSize: 24, fontWeight: "900", color: COLORS.ink },
  successText: { fontSize: 14, color: COLORS.muted, lineHeight: 22, marginTop: 10 },
  rewardGrid: { gap: 10, marginTop: 18 },
  rewardPill: { borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceHover, padding: 14 },
  rewardText: { fontSize: 14, fontWeight: "800", color: COLORS.inkSoft },
  verifyCard: { padding: 16, marginTop: 16 },
})
