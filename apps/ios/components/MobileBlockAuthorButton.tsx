import { useState } from "react"
import { Alert, TouchableOpacity, Text, StyleSheet } from "react-native"
import { ShieldOff } from "lucide-react-native"

import { ApiError, blockReviewAuthor } from "../lib/api"
import { COLORS } from "../theme"

export function MobileBlockAuthorButton({
  reviewId,
  onBlocked,
  onAuthRequired,
}: {
  reviewId: string
  onBlocked?: () => void
  onAuthRequired?: () => void
}) {
  const [busy, setBusy] = useState(false)

  function confirmBlock() {
    Alert.alert(
      "屏蔽这位评价者？",
      "之后你将不再看到这位评价者发布的公开评价。不会向对方透露你的身份。",
      [
        { text: "取消", style: "cancel" },
        { text: "屏蔽", style: "destructive", onPress: () => void handleBlock() },
      ],
    )
  }

  async function handleBlock() {
    if (busy) return
    setBusy(true)
    try {
      await blockReviewAuthor(reviewId)
      onBlocked?.()
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onAuthRequired?.()
      } else {
        Alert.alert("暂时无法屏蔽", "请检查网络后重试。")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <TouchableOpacity
      onPress={confirmBlock}
      disabled={busy}
      activeOpacity={0.78}
      style={S.button}
      accessibilityRole="button"
      accessibilityLabel="屏蔽评价者"
      accessibilityState={{ disabled: busy }}
      testID={`block-author-${reviewId}`}
    >
      <ShieldOff size={14} color={COLORS.muted} />
      <Text style={S.text}>{busy ? "处理中" : "屏蔽"}</Text>
    </TouchableOpacity>
  )
}

const S = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceHover,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  text: { fontSize: 12, fontWeight: "700", color: COLORS.muted },
})
