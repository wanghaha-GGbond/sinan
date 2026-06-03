import { useEffect, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from "react-native"
import { CheckCircle2, Flag, X } from "lucide-react-native"

import { COLORS, RADIUS } from "../theme"
import {
  REPORT_REASONS,
  getReportForReviewAsync,
  submitReportAsync,
  type ReportReasonId,
} from "../lib/storage"

export function MobileReportButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReasonId | "">("")
  const [note, setNote] = useState("")
  const [submittedReason, setSubmittedReason] = useState<ReportReasonId | null>(null)

  useEffect(() => {
    let cancelled = false
    getReportForReviewAsync(reviewId).then((existing) => {
      if (!cancelled && existing) setSubmittedReason(existing.reason)
    })
    return () => {
      cancelled = true
    }
  }, [reviewId])

  if (submittedReason && !open) {
    const label = REPORT_REASONS.find((r) => r.id === submittedReason)?.label ?? "已举报"
    return (
      <View
        style={S.submitted}
        accessibilityLabel={`已举报:${label}`}
        testID={`report-submitted-${reviewId}`}
      >
        <CheckCircle2 size={14} color={COLORS.primaryForeground} />
        <Text style={S.submittedText}>已举报:{label}</Text>
      </View>
    )
  }

  if (!open) {
    return (
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        style={S.trigger}
        testID={`report-button-${reviewId}`}
        accessibilityLabel="举报"
      >
        <Flag size={14} color={COLORS.riskForeground} />
        <Text style={S.triggerText}>举报</Text>
      </TouchableOpacity>
    )
  }

  async function handleSubmit() {
    if (!reason) return
    await submitReportAsync({ reviewId, reason: reason as ReportReasonId, note })
    setSubmittedReason(reason as ReportReasonId)
    setOpen(false)
    setReason("")
    setNote("")
  }

  return (
    <View style={S.form} testID={`report-form-${reviewId}`}>
      <View style={S.formHeader}>
        <Text style={S.formTitle}>举报这条评价</Text>
        <TouchableOpacity
          onPress={() => setOpen(false)}
          hitSlop={8}
          accessibilityLabel="关闭举报"
        >
          <X size={16} color={COLORS.muted} />
        </TouchableOpacity>
      </View>
      <Text style={S.formHint}>
        司南优先保护匿名与事实表达。明确违规的内容会被下架。
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={S.reasonScroll}
      >
        {REPORT_REASONS.map((option) => {
          const selected = reason === option.id
          return (
            <TouchableOpacity
              key={option.id}
              activeOpacity={0.85}
              onPress={() => setReason(option.id)}
              style={[S.reasonPill, selected && S.reasonPillSelected]}
              testID={`report-reason-${reviewId}-${option.id}`}
            >
              <Text style={[S.reasonText, selected && S.reasonTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
      <TextInput
        value={note}
        onChangeText={setNote}
        maxLength={200}
        placeholder="补充说明(选填),不超过 200 字"
        placeholderTextColor={COLORS.mutedLight}
        multiline
        style={S.noteInput}
      />
      <View style={S.formActions}>
        <TouchableOpacity onPress={() => setOpen(false)} activeOpacity={0.85} style={S.btnGhost}>
          <Text style={S.btnGhostText}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={!reason}
          style={[S.btnPrimary, !reason && S.btnPrimaryDisabled]}
          testID={`report-submit-${reviewId}`}
        >
          <Text style={S.btnPrimaryText}>提交举报</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.riskSoft,
  },
  triggerText: { fontSize: 12, fontWeight: "800", color: COLORS.riskForeground },
  submitted: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
  },
  submittedText: { fontSize: 12, fontWeight: "700", color: COLORS.primaryForeground },
  form: {
    marginTop: 12,
    borderRadius: RADIUS.lg,
    backgroundColor: "#F9FAF7",
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  formTitle: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  formHint: { fontSize: 12, color: COLORS.muted, lineHeight: 18 },
  reasonScroll: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  reasonPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
  },
  reasonPillSelected: { borderColor: COLORS.risk, backgroundColor: COLORS.riskSoft },
  reasonText: { fontSize: 12, fontWeight: "700", color: COLORS.inkSoft },
  reasonTextSelected: { color: COLORS.riskForeground },
  noteInput: {
    minHeight: 64,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    padding: 10,
    fontSize: 13,
    color: COLORS.ink,
    textAlignVertical: "top",
  },
  formActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  btnGhost: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  btnGhostText: { fontSize: 13, fontWeight: "700", color: COLORS.muted },
  btnPrimary: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  btnPrimaryDisabled: { backgroundColor: COLORS.mutedLight },
  btnPrimaryText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
})
