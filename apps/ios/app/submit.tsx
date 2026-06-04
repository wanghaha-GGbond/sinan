import { useMemo, useState } from "react"
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { CheckCircle2, Shield, Sparkles, X } from "lucide-react-native"

import { COLORS, RADIUS, SHADOWS } from "../theme"
import { companies, searchCompanies, type MobileCompany } from "../data"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"
import { SolidInput } from "../components/SolidInput"
import { MetricPill, SolidTopbar, TagPill } from "../components/SinanPrimitives"

const relations = ["在职员工", "离职员工", "面试者", "实习生", "外包 / 派遣"] as const
type RelationValue = (typeof relations)[number]

interface DimensionDef {
  key: string
  label: string
  description: string
}

const DIMENSIONS: DimensionDef[] = [
  { key: "salary", label: "薪资兑现", description: "薪资区间、奖金兑现、调薪透明度" },
  { key: "worklife", label: "工作生活平衡", description: "加班强度与恢复时间" },
  { key: "management", label: "管理水平", description: "目标、汇报线、绩效反馈是否稳定" },
  { key: "growth", label: "成长空间", description: "项目复杂度、学习密度、晋升通道" },
  { key: "culture", label: "团队氛围", description: "同事关系、沟通方式、跨团队协作" },
  { key: "stability", label: "稳定性", description: "组织调整节奏、HC 稳定性" },
  { key: "integrity", label: "诚信度", description: "承诺兑现、招聘真实性" },
]

const QUICK_TAGS = [
  "成长快", "项目含金量高", "流程清晰", "导师投入", "福利实在",
  "加班波动", "跨部门成本", "管理混乱", "承诺不一致", "新人友好", "节奏密集", "技术氛围好",
]

interface FormState {
  relation: RelationValue
  role: string
  directionScore: number
  dimensions: Record<string, number>
  shortComment: string
  content: string
  tags: string[]
  salaryRange: string
  safetyChecked: boolean
  safetyItems: boolean[]
}

const SAFETY_ITEMS = [
  "没有出现真实姓名",
  "没有出现手机号 / 邮箱 / 住址",
  "没有出现直属领导姓名",
  "没有上传公司内部文件 / 截图",
  "没有泄露商业秘密 / 客户信息",
  "内容基于我的真实经历或合理主观感受",
]

const INITIAL_DIMENSIONS: Record<string, number> = {
  salary: 7,
  worklife: 6,
  management: 7,
  growth: 7,
  culture: 7,
  stability: 7,
  integrity: 7,
}

const INITIAL_FORM: FormState = {
  relation: "离职员工",
  role: "",
  directionScore: 7,
  dimensions: INITIAL_DIMENSIONS,
  shortComment: "",
  content: "",
  tags: [],
  salaryRange: "",
  safetyChecked: false,
  safetyItems: SAFETY_ITEMS.map(() => false),
}

interface StepDef {
  key: "company" | "scores" | "short" | "content" | "tags" | "review" | "success"
  title: string
  description: string
}

const STEPS: StepDef[] = [
  { key: "company", title: "选择公司与身份", description: "公司名 + 你的身份 + 岗位" },
  { key: "scores", title: "方向评分", description: "综合方向分 + 7 维度评分" },
  { key: "short", title: "一句话短评", description: "用一句话告诉后来者:适合谁 / 不适合谁" },
  { key: "content", title: "真实体验", description: "写事实、流程、风险点" },
  { key: "tags", title: "标签 + 薪资", description: "勾选印象标签,补充薪资区间(可跳)" },
  { key: "review", title: "匿名安全检查", description: "发布前最后过一遍" },
]

export default function SubmitScreen() {
  const params = useLocalSearchParams<{
    companyId?: string
    companyName?: string
    mode?: string
    name?: string
  }>()
  const addCompanyMode = params.mode === "add-company"
  const initialCompany = companies.find((company) => company.id === params.companyId) ?? companies[0]
  const initialQuery = params.name ?? params.companyName ?? (addCompanyMode ? "" : initialCompany.name)

  const [stepIndex, setStepIndex] = useState(0)
  const [companyQuery, setCompanyQuery] = useState(initialQuery)
  const [selectedCompany, setSelectedCompany] = useState<MobileCompany | null>(
    addCompanyMode ? null : initialCompany
  )
  const [addingCompany, setAddingCompany] = useState(addCompanyMode)
  const [newCompanyCity, setNewCompanyCity] = useState("")
  const [newCompanyIndustry, setNewCompanyIndustry] = useState("")
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [submitted, setSubmitted] = useState(false)

  const matchedCompanies = useMemo(() => searchCompanies(companyQuery).slice(0, 4), [companyQuery])
  const totalSteps = STEPS.length
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100)
  const step = STEPS[stepIndex]

  function canGoNext(): boolean {
    if (step.key === "company") {
      return Boolean(selectedCompany && form.role.trim())
    }
    if (step.key === "scores") {
      return form.directionScore >= 0
    }
    if (step.key === "short") {
      return form.shortComment.trim().length >= 6
    }
    if (step.key === "content") {
      return form.content.trim().length >= 30
    }
    if (step.key === "tags") return true
    if (step.key === "review") return form.safetyChecked
    return false
  }

  function setDimension(key: string, value: number) {
    setForm((current) => ({ ...current, dimensions: { ...current.dimensions, [key]: value } }))
  }

  function toggleTag(tag: string) {
    setForm((current) => {
      const next = current.tags.includes(tag)
        ? current.tags.filter((t) => t !== tag)
        : [...current.tags, tag]
      return { ...current, tags: next }
    })
  }

  function setSafetyItem(index: number, value: boolean) {
    setForm((current) => {
      const items = [...current.safetyItems]
      items[index] = value
      return { ...current, safetyItems: items, safetyChecked: value ? current.safetyChecked : current.safetyChecked }
    })
  }

  function handleSubmit() {
    setSubmitted(true)
  }

  function resetForm() {
    setForm(INITIAL_FORM)
    setStepIndex(0)
    setSubmitted(false)
  }

  // ── Success state ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <ScrollView style={S.container} contentContainerStyle={S.successWrap}>
        <SolidTopbar back title="已提交" subtitle="等待审核" />
        <SolidCard variant="elevated" style={S.successCard}>
          <View style={S.successIcon}>
            <Sparkles size={24} color={COLORS.primaryForeground} />
          </View>
          <Text style={S.successTitle}>评价已进入匿名预览</Text>
          <Text style={S.successText}>
            你的评价会在审核后展示。正式版本会先完成匿名保护和真实性校验,再进入公开样本。
          </Text>
          <View style={S.rewardGrid}>
            {["方向值 +20", "连续点灯 +1", "司南徽章进度 +1"].map((item) => (
              <View key={item} style={S.rewardPill}>
                <Text style={S.rewardText}>{item}</Text>
              </View>
            ))}
          </View>
          <View style={S.successActions}>
            <SolidButton title="返回推荐" variant="primary" size="lg" onPress={() => router.push("/")} />
            <SolidButton title="再写一条" variant="secondary" size="lg" onPress={resetForm} />
          </View>
        </SolidCard>

        <SolidCard variant="subtle" style={S.verifyCard}>
          <View style={S.verifyHead}>
            <Shield size={16} color={COLORS.primary} />
            <Text style={S.sectionTitle}>匿名真实性校验</Text>
          </View>
          <Text style={S.helperText}>你可以继续补充身份凭证(在职邮件、offer 截图等),凭证只用于匿名校验,不向公司端开放。</Text>
          <View style={S.inlineButtons}>
            <SolidButton title="稍后补充" variant="secondary" size="sm" />
            <SolidButton title="立即验证" variant="primary" size="sm" />
          </View>
        </SolidCard>
      </ScrollView>
    )
  }

  // ── Form state ─────────────────────────────────────────────────────────
  return (
    <ScrollView style={S.container} contentContainerStyle={S.content}>
      <SolidTopbar
        back
        title={addCompanyMode ? "添加未收录公司" : "发布评价"}
        subtitle={`${stepIndex + 1} / ${totalSteps} · ${step.title}`}
      />

      {/* Progress strip */}
      <View style={S.progressCard}>
        <View style={S.formHead}>
          <View style={{ flex: 1 }}>
            <Text style={S.formTitle}>{step.title}</Text>
            <Text style={S.helperText}>{step.description}</Text>
          </View>
          <Text style={S.stepCount}>{Math.round(progress)}%</Text>
        </View>
        <View style={S.progressTrack}>
          <View style={[S.progressFill, { width: `${progress}%` }]} />
        </View>
        {/* step pill row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.stepPillRow}
          style={S.stepPillScroll}
        >
          {STEPS.map((entry, index) => {
            const isCurrent = index === stepIndex
            const isDone = index < stepIndex
            return (
              <TouchableOpacity
                key={entry.key}
                activeOpacity={0.85}
                onPress={() => setStepIndex(index)}
                style={[S.stepPill, isCurrent && S.stepPillCurrent, isDone && S.stepPillDone]}
                testID={`submit-step-${entry.key}`}
              >
                {isDone ? (
                  <CheckCircle2 size={12} color="#FFFFFF" />
                ) : (
                  <Text style={[S.stepPillIndex, isCurrent && S.stepPillIndexCurrent]}>
                    {index + 1}
                  </Text>
                )}
                <Text style={[S.stepPillLabel, isCurrent && S.stepPillLabelCurrent, isDone && S.stepPillLabelDone]}>
                  {entry.title}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Step body */}
      <SolidCard variant="default" style={S.formCard}>
        {step.key === "company" ? (
          <CompanyStep
            companyQuery={companyQuery}
            setCompanyQuery={setCompanyQuery}
            matchedCompanies={matchedCompanies}
            selectedCompany={selectedCompany}
            onSelectCompany={setSelectedCompany}
            addingCompany={addingCompany}
            setAddingCompany={setAddingCompany}
            newCompanyCity={newCompanyCity}
            setNewCompanyCity={setNewCompanyCity}
            newCompanyIndustry={newCompanyIndustry}
            setNewCompanyIndustry={setNewCompanyIndustry}
            role={form.role}
            setRole={(value) => setForm((c) => ({ ...c, role: value }))}
            relation={form.relation}
            setRelation={(value) => setForm((c) => ({ ...c, relation: value }))}
          />
        ) : null}

        {step.key === "scores" ? (
          <ScoresStep
            directionScore={form.directionScore}
            setDirectionScore={(value) => setForm((c) => ({ ...c, directionScore: value }))}
            dimensions={form.dimensions}
            setDimension={setDimension}
            interviewDifficulty={
              // kept in local state for back-compat — but not surfaced
              INITIAL_FORM.directionScore
            }
            salaryRange={form.salaryRange}
            setSalaryRange={(value) => setForm((c) => ({ ...c, salaryRange: value }))}
          />
        ) : null}

        {step.key === "short" ? (
          <ShortCommentStep
            value={form.shortComment}
            onChange={(value) => setForm((c) => ({ ...c, shortComment: value }))}
          />
        ) : null}

        {step.key === "content" ? (
          <ContentStep
            value={form.content}
            onChange={(value) => setForm((c) => ({ ...c, content: value }))}
          />
        ) : null}

        {step.key === "tags" ? (
          <TagsStep
            tags={form.tags}
            onToggle={toggleTag}
            salaryRange={form.salaryRange}
            onSalaryChange={(value) => setForm((c) => ({ ...c, salaryRange: value }))}
          />
        ) : null}

        {step.key === "review" ? (
          <ReviewStep
            summary={{
              company: selectedCompany?.name,
              role: form.role,
              relation: form.relation,
              directionScore: form.directionScore,
              shortComment: form.shortComment,
              tagsCount: form.tags.length,
              contentLength: form.content.length,
              salaryRange: form.salaryRange,
            }}
            safetyChecked={form.safetyChecked}
            setSafetyChecked={(value) => setForm((c) => ({ ...c, safetyChecked: value }))}
            safetyItems={form.safetyItems}
            onToggleSafetyItem={setSafetyItem}
          />
        ) : null}

        <View style={S.navRow}>
          <SolidButton
            title="上一步"
            variant="secondary"
            disabled={stepIndex === 0}
            onPress={() => setStepIndex((value) => Math.max(0, value - 1))}
            testID="submit-prev"
          />
          <SolidButton
            title={stepIndex === STEPS.length - 1 ? "提交评价" : "下一步"}
            disabled={!canGoNext()}
            onPress={() => {
              if (stepIndex === STEPS.length - 1) handleSubmit()
              else setStepIndex((value) => Math.min(STEPS.length - 1, value + 1))
            }}
            testID="submit-next"
          />
        </View>
      </SolidCard>
    </ScrollView>
  )
}

// ── Step 1: company + identity + role ────────────────────────────────────

function CompanyStep(props: {
  companyQuery: string
  setCompanyQuery: (value: string) => void
  matchedCompanies: MobileCompany[]
  selectedCompany: MobileCompany | null
  onSelectCompany: (company: MobileCompany | null) => void
  addingCompany: boolean
  setAddingCompany: (value: boolean) => void
  newCompanyCity: string
  setNewCompanyCity: (value: string) => void
  newCompanyIndustry: string
  setNewCompanyIndustry: (value: string) => void
  role: string
  setRole: (value: string) => void
  relation: RelationValue
  setRelation: (value: RelationValue) => void
}) {
  function saveNewCompany() {
    const name = props.companyQuery.trim()
    if (!name || !props.newCompanyCity.trim() || !props.newCompanyIndustry.trim()) return
    props.onSelectCompany({
      ...companies[0],
      id: `company-custom-${Date.now()}`,
      name,
      shortName: name.slice(0, 8),
      city: props.newCompanyCity.trim(),
      industry: props.newCompanyIndustry.trim(),
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
    props.setAddingCompany(false)
  }

  return (
    <View style={S.stepBody}>
      <Text style={S.label}>公司名 *</Text>
      <SolidInput
        value={props.companyQuery}
        onChangeText={(value) => {
          props.setCompanyQuery(value)
          if (props.selectedCompany?.name !== value) props.onSelectCompany(null)
        }}
        placeholder="输入公司名称"
        style={S.input}
        testID="submit-company-input"
      />
      {!props.addingCompany ? (
        <View style={S.companyOptions}>
          {props.matchedCompanies.map((company) => (
            <SolidButton
              key={company.id}
              title={`${company.name} · ${company.industry} · ${company.city}`}
              variant={props.selectedCompany?.id === company.id ? "dark" : "secondary"}
              size="sm"
              onPress={() => props.onSelectCompany(company)}
              style={S.fullButton}
              textStyle={S.optionButtonText}
              testID={`submit-company-option-${company.id}`}
            />
          ))}
        </View>
      ) : null}
      {!props.selectedCompany && !props.addingCompany && props.companyQuery.trim().length >= 2 ? (
        <SolidCard variant="subtle" style={S.noResultCard}>
          <Text style={S.noResultTitle}>还没有这家公司</Text>
          <Text style={S.helperText}>你可以提交公司注册信息,审核通过后开放评价。</Text>
          <SolidButton
            title="添加未收录公司"
            size="sm"
            onPress={() => props.setAddingCompany(true)}
            style={{ alignSelf: "flex-start", marginTop: 10 }}
          />
        </SolidCard>
      ) : null}
      {props.addingCompany ? (
        <SolidCard variant="subtle" style={S.addCompanyCard}>
          <Text style={S.sectionTitle}>添加未收录公司</Text>
          <SolidInput
            value={props.companyQuery}
            onChangeText={props.setCompanyQuery}
            placeholder="完整公司名称 *"
            style={S.input}
          />
          <SolidInput
            value={props.newCompanyCity}
            onChangeText={props.setNewCompanyCity}
            placeholder="注册城市 *"
            style={S.input}
          />
          <SolidInput
            value={props.newCompanyIndustry}
            onChangeText={props.setNewCompanyIndustry}
            placeholder="所属行业 *"
            style={S.input}
          />
          <View style={S.inlineButtons}>
            <SolidButton
              title="提交公司信息"
              size="sm"
              onPress={saveNewCompany}
              disabled={
                !props.companyQuery.trim() || !props.newCompanyCity.trim() || !props.newCompanyIndustry.trim()
              }
            />
            <SolidButton title="取消" variant="ghost" size="sm" onPress={() => props.setAddingCompany(false)} />
          </View>
        </SolidCard>
      ) : null}
      {props.selectedCompany ? (
        <View style={S.selectedPill}>
          <Text style={S.selectedText}>
            {props.selectedCompany.name} · {props.selectedCompany.city} · {props.selectedCompany.industry}
          </Text>
          {props.selectedCompany.stage === "待审核" ? (
            <Text style={S.pendingText}>当前状态:待审核</Text>
          ) : null}
        </View>
      ) : null}

      <Text style={S.label}>岗位 *</Text>
      <SolidInput
        value={props.role}
        onChangeText={props.setRole}
        placeholder="例如:前端工程师"
        style={S.input}
        testID="submit-role-input"
      />

      <Text style={S.label}>身份关系 *</Text>
      <View style={S.chipWrap}>
        {relations.map((item) => (
          <SolidButton
            key={item}
            title={item}
            variant={props.relation === item ? "dark" : "secondary"}
            size="sm"
            onPress={() => props.setRelation(item)}
            testID={`submit-relation-${item}`}
          />
        ))}
      </View>
    </View>
  )
}

// ── Step 2: scores + 7 dimensions ────────────────────────────────────────

function ScoresStep(props: {
  directionScore: number
  setDirectionScore: (value: number) => void
  dimensions: Record<string, number>
  setDimension: (key: string, value: number) => void
  interviewDifficulty: number
  salaryRange: string
  setSalaryRange: (value: string) => void
}) {
  return (
    <View style={S.stepBody}>
      <ScoreSelector
        title="方向分"
        description="结合薪资兑现、工作生活、管理、成长、氛围、稳定、诚信给出综合判断。"
        value={props.directionScore}
        onChange={props.setDirectionScore}
        testID="submit-overall-score"
      />
      <View style={S.dimensionGrid}>
        {DIMENSIONS.map((dim) => (
          <DimensionRow
            key={dim.key}
            dimension={dim}
            value={props.dimensions[dim.key] ?? 7}
            onChange={(value) => props.setDimension(dim.key, value)}
          />
        ))}
      </View>
      <Text style={S.label}>薪资区间(可选)</Text>
      <SolidInput
        value={props.salaryRange}
        onChangeText={props.setSalaryRange}
        placeholder="例如:25k-42k x 14"
        style={S.input}
        testID="submit-salary-input"
      />
    </View>
  )
}

function ScoreSelector(props: {
  title: string
  description: string
  value: number
  onChange: (value: number) => void
  testID?: string
}) {
  return (
    <View style={S.scoreBlock}>
      <View>
        <Text style={S.label}>{props.title}</Text>
        <Text style={S.helperText}>{props.description}</Text>
      </View>
      <Text style={S.bigScore}>{props.value.toFixed(1)}</Text>
      <View style={S.scoreGrid}>
        {Array.from({ length: 11 }, (_, i) => i).map((item) => (
          <TouchableOpacity
            key={item}
            activeOpacity={0.75}
            onPress={() => props.onChange(item)}
            style={[S.scoreButton, props.value === item && S.scoreButtonActive]}
            testID={props.testID ? `${props.testID}-${item}` : undefined}
          >
            <Text style={[S.scoreButtonText, props.value === item && S.scoreButtonTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

function DimensionRow(props: {
  dimension: DimensionDef
  value: number
  onChange: (value: number) => void
}) {
  return (
    <View style={S.dimensionRow}>
      <View style={S.dimensionHead}>
        <Text style={S.dimensionLabel}>{props.dimension.label}</Text>
        <Text style={S.dimensionScore}>{props.value.toFixed(1)}</Text>
      </View>
      <Text style={S.dimensionDesc}>{props.dimension.description}</Text>
      <View style={S.dimensionBar}>
        {Array.from({ length: 11 }, (_, i) => i).map((item) => {
          const active = item <= props.value
          return (
            <TouchableOpacity
              key={item}
              activeOpacity={0.7}
              onPress={() => props.onChange(item)}
              style={[S.dimensionTick, active && S.dimensionTickActive]}
              testID={`submit-dim-${props.dimension.key}-${item}`}
            >
              {active ? <View style={S.dimensionTickInner} /> : null}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

// ── Step 3: short comment ────────────────────────────────────────────────

function ShortCommentStep(props: { value: string; onChange: (value: string) => void }) {
  return (
    <View style={S.stepBody}>
      <Text style={S.label}>一句话告诉后来者 *</Text>
      <Text style={S.helperText}>
        用一句话回答"这家公司适合什么人 / 不适合什么人"。例:适合想快成长的人,不适合追求稳定和边界感的人。
      </Text>
      <SolidInput
        value={props.value}
        onChangeText={props.onChange}
        placeholder="适合想快成长的人,但不适合追求稳定和边界感的人"
        style={S.input}
        maxLength={80}
        testID="submit-short-input"
      />
      <Text style={S.helperText}>{props.value.length}/80 字</Text>
    </View>
  )
}

// ── Step 4: full content ─────────────────────────────────────────────────

function ContentStep(props: { value: string; onChange: (value: string) => void }) {
  return (
    <View style={S.stepBody}>
      <Text style={S.label}>真实体验 *</Text>
      <Text style={S.helperText}>建议写事实、流程、风险点和你会问候选人的问题。至少 30 字。</Text>
      <SolidInput
        value={props.value}
        onChangeText={props.onChange}
        placeholder="比如:流程节奏、关键风险、你会问候选人的问题…"
        multiline
        style={[S.input, S.textarea]}
        maxLength={1500}
        testID="submit-content-input"
      />
      <Text style={S.helperText}>
        {props.value.length}/1500 字 {props.value.length < 30 ? `· 还差 ${30 - props.value.length} 字到 30` : ""}
      </Text>
    </View>
  )
}

// ── Step 5: tags + salary ────────────────────────────────────────────────

function TagsStep(props: {
  tags: string[]
  onToggle: (tag: string) => void
  salaryRange: string
  onSalaryChange: (value: string) => void
}) {
  return (
    <View style={S.stepBody}>
      <Text style={S.label}>印象标签(多选,可跳)</Text>
      <Text style={S.helperText}>勾选最贴切的标签,帮助后来者快速对齐预期。</Text>
      <View style={S.tagGrid}>
        {QUICK_TAGS.map((tag) => {
          const active = props.tags.includes(tag)
          return (
            <TouchableOpacity
              key={tag}
              activeOpacity={0.85}
              onPress={() => props.onToggle(tag)}
              style={[S.tagChip, active && S.tagChipActive]}
              testID={`submit-tag-${tag}`}
            >
              <Text style={[S.tagChipText, active && S.tagChipTextActive]}>{tag}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <Text style={S.label}>薪资区间(可跳)</Text>
      <SolidInput
        value={props.salaryRange}
        onChangeText={props.onSalaryChange}
        placeholder="例如:25k-42k x 14"
        style={S.input}
        testID="submit-tags-salary-input"
      />
    </View>
  )
}

// ── Step 6: review + safety ──────────────────────────────────────────────

function ReviewStep(props: {
  summary: {
    company?: string
    role: string
    relation: RelationValue
    directionScore: number
    shortComment: string
    tagsCount: number
    contentLength: number
    salaryRange?: string
  }
  safetyChecked: boolean
  setSafetyChecked: (value: boolean) => void
  safetyItems: boolean[]
  onToggleSafetyItem: (index: number, value: boolean) => void
}) {
  return (
    <View style={S.stepBody}>
      <Text style={S.label}>提交前确认</Text>
      <View style={S.summaryCard}>
        <SummaryRow label="公司" value={props.summary.company ?? "(未选)"} />
        <SummaryRow label="身份" value={`${props.summary.relation} · ${props.summary.role || "(未填)"}`} />
        <SummaryRow label="方向分" value={props.summary.directionScore.toFixed(1)} />
        <SummaryRow label="短评" value={props.summary.shortComment || "(未填)"} />
        <SummaryRow label="真实体验" value={`${props.summary.contentLength} 字`} />
        <SummaryRow label="标签" value={`${props.summary.tagsCount} 个`} />
        <SummaryRow label="薪资区间" value={props.summary.salaryRange || "(未填)"} />
      </View>

      <Text style={[S.label, S.safetyHead]}>匿名安全检查</Text>
      <Text style={S.helperText}>逐条确认。司南会先做匿名保护 + 真实性校验,再公开。</Text>
      <View style={S.safetyList}>
        {SAFETY_ITEMS.map((item, index) => {
          const checked = props.safetyItems[index]
          return (
            <TouchableOpacity
              key={item}
              activeOpacity={0.8}
              onPress={() => props.onToggleSafetyItem(index, !checked)}
              style={S.safetyRow}
              testID={`submit-safety-${index}`}
            >
              <View style={[S.checkbox, checked && S.checkboxActive]}>
                {checked ? <Text style={S.checkboxText}>✓</Text> : null}
              </View>
              <Text style={S.safetyRowText}>{item}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => props.setSafetyChecked(!props.safetyChecked)}
        style={S.safetyFinal}
        testID="submit-safety-final"
      >
        <View style={[S.checkbox, props.safetyChecked && S.checkboxActive]}>
          {props.safetyChecked ? <Text style={S.checkboxText}>✓</Text> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.safetyFinalTitle}>我确认上述内容已通过匿名安全检查</Text>
          <Text style={S.helperText}>勾选后才会启用"提交评价"按钮。</Text>
        </View>
      </TouchableOpacity>
    </View>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={S.summaryRow}>
      <Text style={S.summaryLabel}>{label}</Text>
      <Text style={S.summaryValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 96 },
  progressCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS["2xl"],
    borderWidth: 1,
    borderColor: `${COLORS.border}99`,
  },
  formHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  formTitle: { fontSize: 20, fontWeight: "800", color: COLORS.ink },
  stepCount: { fontSize: 14, fontWeight: "800", color: COLORS.primary },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceHover,
    overflow: "hidden",
    marginTop: 14,
  },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: COLORS.primary },
  stepPillScroll: { marginTop: 12 },
  stepPillRow: { gap: 8, paddingRight: 8 },
  stepPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepPillCurrent: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  stepPillDone: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primarySoft },
  stepPillIndex: { fontSize: 11, fontWeight: "900", color: COLORS.muted, minWidth: 12, textAlign: "center" },
  stepPillIndexCurrent: { color: "#FFFFFF" },
  stepPillLabel: { fontSize: 12, fontWeight: "800", color: COLORS.inkSoft },
  stepPillLabelCurrent: { color: "#FFFFFF" },
  stepPillLabelDone: { color: COLORS.primaryForeground },
  formCard: { margin: 16, marginTop: 8, padding: 16 },
  stepBody: { gap: 12 },
  label: { fontSize: 14, fontWeight: "800", color: COLORS.inkSoft, marginTop: 6 },
  safetyHead: { marginTop: 14 },
  input: { backgroundColor: COLORS.surface, borderColor: COLORS.borderSoft, ...SHADOWS.cardSubtle },
  textarea: { minHeight: 180, textAlignVertical: "top" },
  companyOptions: { gap: 8 },
  fullButton: { justifyContent: "flex-start", minHeight: 38 },
  optionButtonText: { flexShrink: 1, textAlign: "left" },
  noResultCard: { padding: 14 },
  noResultTitle: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  addCompanyCard: { gap: 10, padding: 14 },
  selectedPill: { borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceHover, padding: 12 },
  selectedText: { fontSize: 13, fontWeight: "700", color: COLORS.inkSoft },
  pendingText: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  inlineButtons: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  helperText: { fontSize: 13, color: COLORS.muted, lineHeight: 20 },
  scoreBlock: { gap: 10 },
  bigScore: { fontSize: 48, fontWeight: "900", color: COLORS.primary, textAlign: "center" },
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
  dimensionGrid: { gap: 12 },
  dimensionRow: { gap: 6 },
  dimensionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dimensionLabel: { fontSize: 13, fontWeight: "800", color: COLORS.ink },
  dimensionScore: { fontSize: 13, fontWeight: "800", color: COLORS.primaryDark },
  dimensionDesc: { fontSize: 11, color: COLORS.muted, lineHeight: 16 },
  dimensionBar: { flexDirection: "row", gap: 4 },
  dimensionTick: {
    flex: 1,
    height: 22,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceHover,
    alignItems: "center",
    justifyContent: "center",
  },
  dimensionTickActive: { backgroundColor: COLORS.primary },
  dimensionTickInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },
  tagGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceHover,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tagChipText: { fontSize: 12, color: COLORS.inkSoft, fontWeight: "700" },
  tagChipTextActive: { color: "#FFFFFF" },
  summaryCard: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 6,
  },
  summaryRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  summaryLabel: { fontSize: 12, color: COLORS.muted, width: 64, fontWeight: "700" },
  summaryValue: { fontSize: 13, color: COLORS.ink, flex: 1, lineHeight: 18 },
  safetyList: { gap: 8 },
  safetyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  safetyRowText: { fontSize: 13, color: COLORS.ink, flex: 1, lineHeight: 18 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkboxText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13 },
  safetyFinal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    padding: 12,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primarySoft,
  },
  safetyFinalTitle: { fontSize: 13, fontWeight: "800", color: COLORS.primaryForeground },
  navRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 18 },
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
  successTitle: { fontSize: 24, fontWeight: "900", color: COLORS.ink },
  successText: { fontSize: 14, color: COLORS.muted, lineHeight: 22, marginTop: 10 },
  rewardGrid: { gap: 10, marginTop: 18 },
  rewardPill: { borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceHover, padding: 14 },
  rewardText: { fontSize: 14, fontWeight: "800", color: COLORS.inkSoft },
  successActions: { gap: 10, marginTop: 18 },
  verifyCard: { padding: 16, marginTop: 16 },
  verifyHead: { flexDirection: "row", alignItems: "center", gap: 6 },
})
