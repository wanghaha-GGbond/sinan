import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { COLORS, RADIUS, SHADOWS } from "../theme"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"
import { SolidInput } from "../components/SolidInput"

const ROLES = ["后端开发", "前端开发", "产品经理", "设计师", "测试", "运营", "市场", "HR", "其他"]
const EMPLOYMENTS = ["在职", "已离职", "实习"]

export default function SubmitScreen() {
  const { companyId, companyName } = useLocalSearchParams<{ companyId: string; companyName: string }>()
  const [step, setStep] = useState(0)
  const [role, setRole] = useState("")
  const [employment, setEmployment] = useState("在职")
  const [score, setScore] = useState(3.0)
  const [recommend, setRecommend] = useState(true)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <View style={[S.container, S.center]}>
        <Text style={S.emoji}>🎉</Text>
        <Text style={S.successTitle}>评价已提交！</Text>
        <Text style={S.successSub}>感谢你的真实分享</Text>
        <SolidButton title="返回" variant="secondary" onPress={() => router.back()} style={{ marginTop: 24 }} />
      </View>
    )
  }

  return (
    <ScrollView style={S.container}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={S.back}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>评价 {companyName}</Text>
      </View>

      {/* Progress dots */}
      <View style={S.progress}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[S.progDot, i <= step && S.progActive]} />
        ))}
      </View>

      {/* Step 0: role + employment */}
      {step === 0 && (
        <View style={S.body}>
          <Text style={S.question}>你的岗位和状态？</Text>
          <View style={S.chipGrid}>
            {ROLES.map((r) => (
              <TouchableOpacity key={r} onPress={() => setRole(r)} style={[S.chip, role === r && S.chipActive]}>
                <Text style={[S.chipText, role === r && { color: "#FFF" }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={S.toggleRow}>
            {EMPLOYMENTS.map((e) => (
              <TouchableOpacity key={e} onPress={() => setEmployment(e)} style={[S.toggleBtn, employment === e && S.toggleActive]}>
                <Text style={[S.toggleText, employment === e && { color: "#FFF" }]}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {role ? <SolidButton title="下一步" onPress={() => setStep(1)} /> : null}
        </View>
      )}

      {/* Step 1: score + recommend */}
      {step === 1 && (
        <View style={[S.body, { alignItems: "center" }]}>
          <Text style={S.question}>给 {companyName} 打多少分？</Text>
          <Text style={S.bigScore}>{score.toFixed(1)}</Text>
          <View style={S.scoreSliderRow}>
            {[1, 2, 3, 4, 5].map((v) => (
              <TouchableOpacity key={v} onPress={() => setScore(v)} style={[S.scoreBtn, score >= v && S.scoreBtnActive]}>
                <Text style={[S.scoreBtnText, score >= v && { color: "#FFF" }]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={() => setRecommend(!recommend)} style={S.recommendToggle}>
            <Text style={S.recommendText}>{recommend ? "✅ 推荐入职" : "❌ 不推荐"}</Text>
          </TouchableOpacity>
          <SolidButton title="下一步" onPress={() => setStep(2)} style={{ marginTop: 20 }} />
        </View>
      )}

      {/* Step 2: text */}
      {step === 2 && (
        <View style={S.body}>
          <Text style={S.question}>写点什么吧</Text>
          <SolidInput placeholder="评价标题" value={title} onChangeText={setTitle} style={{ marginBottom: 12 }} />
          <SolidInput
            placeholder="你的真实体验..."
            value={content}
            onChangeText={setContent}
            multiline
            style={{ height: 120, textAlignVertical: "top" }}
          />
          <Text style={S.privacy}>🔒 你的身份将匿名保护</Text>
          <SolidButton
            title="提交评价"
            disabled={!title || !content}
            onPress={() => setSubmitted(true)}
            style={{ marginTop: 16 }}
          />
        </View>
      )}
    </ScrollView>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { justifyContent: "center", alignItems: "center" },

  header: {
    padding: 16, paddingTop: 56, backgroundColor: COLORS.dark,
    flexDirection: "row", alignItems: "center",
  },
  back: { color: "#FFF", fontSize: 20, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFF" },

  progress: { flexDirection: "row", justifyContent: "center", gap: 8, padding: 16 },
  progDot: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  progActive: { backgroundColor: COLORS.primary },

  body: { padding: 20 },
  question: { fontSize: 18, fontWeight: "700", color: COLORS.ink, marginBottom: 20 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.cardSubtle,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 14, color: COLORS.ink },
  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  toggleBtn: {
    flex: 1, padding: 10, borderRadius: 12,
    backgroundColor: COLORS.surface, alignItems: "center",
    borderWidth: 1, borderColor: COLORS.border,
  },
  toggleActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  toggleText: { fontSize: 14, fontWeight: "600", color: COLORS.ink },

  bigScore: { fontSize: 72, fontWeight: "800", color: COLORS.primary, marginVertical: 12 },
  scoreSliderRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  scoreBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: "center", alignItems: "center",
  },
  scoreBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  scoreBtnText: { fontSize: 18, fontWeight: "700", color: COLORS.ink },
  recommendToggle: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  recommendText: { fontSize: 14, fontWeight: "600", color: COLORS.ink },

  privacy: { fontSize: 12, color: COLORS.muted, marginTop: 8 },

  emoji: { fontSize: 48 },
  successTitle: { fontSize: 20, fontWeight: "700", color: COLORS.ink, marginTop: 16 },
  successSub: { fontSize: 14, color: COLORS.muted, marginTop: 8 },
})
