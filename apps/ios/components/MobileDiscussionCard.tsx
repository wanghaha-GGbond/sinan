import { useEffect, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Heart, MessageCircle } from "lucide-react-native"

import { COLORS, RADIUS } from "../theme"
import { type ReviewDiscussion } from "../lib/storage"
import { isDiscussionUsefulByMeAsync, toggleDiscussionUsefulAsync } from "../lib/storage"

function avatarColorFor(label: string): { bg: string; fg: string } {
  // Deterministic colour from author label — mirrors web's `avatarColor`.
  const palette = [
    { bg: "#DFF8EC", fg: "#07563A" },
    { bg: "#FFF1D6", fg: "#92400E" },
    { bg: "#E0F2FE", fg: "#075985" },
    { bg: "#FCE7F3", fg: "#9D174D" },
    { bg: "#EDE9FE", fg: "#5B21B6" },
  ]
  let h = 0
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

function avatarInitial(label: string): string {
  if (!label) return "?"
  // For Chinese, use the first character; for English, use first letter uppercased.
  const ch = label.trim()[0]
  return ch.toUpperCase()
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60_000)
  if (min < 1) return "刚刚"
  if (min < 60) return `${min} 分钟前`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day} 天前`
  return new Date(iso).toLocaleDateString("zh-CN")
}

export function MobileDiscussionCard({
  discussion,
  onReply,
}: {
  discussion: ReviewDiscussion
  onReply?: () => void
}) {
  const [liked, setLiked] = useState(discussion.isUsefulByCurrentUser ?? false)
  const [count, setCount] = useState(discussion.usefulCount)

  // Hydrate per-mount in case the persisted state differs.
  useEffect(() => {
    let cancelled = false
    isDiscussionUsefulByMeAsync(discussion.id).then((v) => {
      if (!cancelled) setLiked(v)
    })
    return () => {
      cancelled = true
    }
  }, [discussion.id])

  async function handleUseful() {
    const next = await toggleDiscussionUsefulAsync(discussion.id)
    setLiked(next)
    setCount((c) => c + (next ? 1 : -1))
  }

  const avatar = avatarColorFor(discussion.authorLabel)
  const pending = discussion.status === "pending_review"
  const limited = discussion.status === "limited_visible"

  return (
    <View style={S.card} testID={`discussion-card-${discussion.id}`}>
      <View style={S.avatar} testID={`discussion-avatar-${discussion.id}`}>
        <Text style={[S.avatarText, { color: avatar.fg }]}>
          {avatarInitial(discussion.authorLabel)}
        </Text>
      </View>
      <View style={S.body}>
        {/* Header row: author + type + time */}
        <View style={S.headRow}>
          <Text style={S.author} numberOfLines={1}>
            {discussion.authorLabel}
          </Text>
          <View
            style={[
              S.typePill,
              discussion.type === "追问" ? S.typePillQuestion : S.typePillSupplement,
            ]}
          >
            <Text style={S.typePillText}>{discussion.type}</Text>
          </View>
          <Text style={S.time}>· {timeAgo(discussion.createdAt)}</Text>
        </View>

        {/* Body */}
        {pending ? (
          <View style={S.pendingBox}>
            <Text style={S.pendingTitle}>已提交,等待审核</Text>
            <Text style={S.pendingHint}>
              司南优先保护匿名与事实表达,审核通过后会公开。
            </Text>
            <Text style={S.mutedText} numberOfLines={3}>
              {discussion.content}
            </Text>
          </View>
        ) : limited ? (
          <Text style={S.maskedText} numberOfLines={3}>
            {discussion.content}
          </Text>
        ) : (
          <Text style={S.content}>{discussion.content}</Text>
        )}

        {/* Action bar */}
        <View style={S.actionBar}>
          {onReply ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onReply}
              style={S.actionButton}
              testID={`discussion-reply-${discussion.id}`}
            >
              <MessageCircle size={16} color={COLORS.muted} />
              <Text style={S.actionLabel}>回复</Text>
            </TouchableOpacity>
          ) : (
            <View style={S.actionButton}>
              <MessageCircle size={16} color={COLORS.muted} />
              <Text style={S.actionLabel}>回复</Text>
            </View>
          )}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleUseful}
            style={S.actionButton}
            testID={`discussion-useful-${discussion.id}`}
            accessibilityState={{ selected: liked }}
          >
            <Heart
              size={16}
              color={liked ? "#F91880" : COLORS.muted}
              fill={liked ? "#F91880" : "transparent"}
            />
            <Text style={[S.actionLabel, liked ? S.actionLabelActive : null]}>
              {count > 0 ? count : "有用"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  card: {
    flexDirection: "row",
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#EFF1F2",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
    flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontWeight: "900" },
  body: { flex: 1, minWidth: 0, gap: 8 },
  headRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  author: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  typePillQuestion: { backgroundColor: COLORS.surfaceHover },
  typePillSupplement: { backgroundColor: COLORS.primarySoft },
  typePillText: { fontSize: 10, fontWeight: "800", color: COLORS.inkSoft },
  time: { fontSize: 11, color: COLORS.mutedLight },
  content: { fontSize: 14, lineHeight: 22, color: COLORS.textSecondary },
  maskedText: { fontSize: 14, lineHeight: 22, color: COLORS.mutedLight },
  mutedText: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  pendingBox: {
    padding: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.riskSoft,
    gap: 4,
  },
  pendingTitle: { fontSize: 12, fontWeight: "800", color: COLORS.riskForeground },
  pendingHint: { fontSize: 11, color: COLORS.riskForeground, lineHeight: 16 },
  actionBar: {
    flexDirection: "row",
    gap: 20,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  actionLabel: { fontSize: 12, color: COLORS.muted, fontWeight: "700" },
  actionLabelActive: { color: "#F91880" },
})
