import { useEffect, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native"
import { CheckCircle2, X } from "lucide-react-native"

import { COLORS, RADIUS } from "../theme"
import { SolidButton } from "./SolidButton"
import { type DiscussionType } from "../lib/storage"

const TYPES: Array<{ value: DiscussionType; label: string; description: string }> = [
  { value: "追问", label: "追问", description: "向作者追问更多细节" },
  { value: "补充", label: "补充", description: "提供同岗位 / 同城市的补充体验" },
]

export function MobileDiscussionComposer({
  defaultType = "追问",
  defaultContent = "",
  onSubmit,
  onCancel,
  compact = false,
}: {
  defaultType?: DiscussionType
  defaultContent?: string
  onSubmit: (payload: { type: DiscussionType; content: string }) => void
  onCancel?: () => void
  compact?: boolean
}) {
  const [type, setType] = useState<DiscussionType>(defaultType)
  const [content, setContent] = useState(defaultContent)
  const [error, setError] = useState("")

  // Reset on mount in case composer is recycled between reviews.
  useEffect(() => {
    setType(defaultType)
    setContent(defaultContent)
    setError("")
  }, [defaultType, defaultContent])

  const canSubmit = content.trim().length >= 6

  function handleSubmit() {
    const trimmed = content.trim()
    if (trimmed.length < 6) {
      setError("至少写 6 个字,让作者能看懂你的问题或补充")
      return
    }
    onSubmit({ type, content: trimmed })
  }

  return (
    <View style={[S.box, compact ? S.boxCompact : null]} testID="discussion-composer">
      <View style={S.headerRow}>
        <View style={S.avatar}>
          <Text style={S.avatarText}>我</Text>
        </View>
        <View style={S.headerText}>
          <Text style={S.headerTitle}>写下你的评论</Text>
          <Text style={S.headerHint}>
            司南优先保护匿名身份。建议基于事实提问或补充,避免情绪化。
          </Text>
        </View>
        {onCancel ? (
          <TouchableOpacity
            onPress={onCancel}
            activeOpacity={0.8}
            style={S.closeButton}
            accessibilityLabel="关闭"
          >
            <X size={16} color={COLORS.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={S.typeRow} accessibilityRole="radiogroup" aria-label="评论类型">
        {TYPES.map((option) => {
          const active = type === option.value
          return (
            <TouchableOpacity
              key={option.value}
              activeOpacity={0.85}
              onPress={() => setType(option.value)}
              style={[S.typePill, active ? S.typePillActive : null]}
              testID={`composer-type-${option.value}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Text style={[S.typePillText, active ? S.typePillTextActive : null]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          )
        })}
        <Text style={S.typeHint}>{TYPES.find((t) => t.value === type)?.description}</Text>
      </View>

      <TextInput
        value={content}
        onChangeText={(text) => {
          setContent(text)
          if (error) setError("")
        }}
        placeholder={
          type === "追问"
            ? "比如:面试最后一轮主要问什么?入职后真实节奏跟你描述的差距大吗?"
            : "比如:同岗位 / 同城市的体验是… 风险点是… 想补充的细节是…"
        }
        placeholderTextColor={COLORS.mutedLight}
        multiline
        maxLength={400}
        style={S.input}
        testID="composer-input"
      />

      <View style={S.footerRow}>
        <Text style={S.counter}>
          {content.length}/400
          {content.length > 0 && content.length < 6 ? " · 至少 6 字" : ""}
        </Text>
        {error ? <Text style={S.errorText}>{error}</Text> : null}
      </View>

      <View style={S.actionRow}>
        {onCancel ? (
          <SolidButton title="取消" variant="ghost" size="sm" onPress={onCancel} />
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <SolidButton
          title={type === "追问" ? "提交追问" : "提交补充"}
          variant="primary"
          size="sm"
          onPress={handleSubmit}
          disabled={!canSubmit}
          testID="composer-submit"
        />
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  box: {
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EFF1F2",
    gap: 10,
  },
  boxCompact: { borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "900", color: COLORS.primaryForeground },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  headerHint: { fontSize: 11, color: COLORS.muted, lineHeight: 16, marginTop: 2 },
  closeButton: { padding: 4 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceHover,
  },
  typePillActive: {
    backgroundColor: COLORS.dark,
  },
  typePillText: { fontSize: 12, fontWeight: "800", color: COLORS.inkSoft },
  typePillTextActive: { color: "#FFFFFF" },
  typeHint: {
    flexBasis: "100%",
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  input: {
    minHeight: 96,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    padding: 10,
    fontSize: 14,
    color: COLORS.ink,
    textAlignVertical: "top",
    lineHeight: 22,
  },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  counter: { fontSize: 11, color: COLORS.muted },
  errorText: { fontSize: 11, color: COLORS.riskForeground, fontWeight: "700" },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
})
