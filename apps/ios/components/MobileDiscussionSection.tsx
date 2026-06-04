import { useEffect, useMemo, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { MessageCircle } from "lucide-react-native"

import { COLORS, RADIUS } from "../theme"
import { SolidButton } from "./SolidButton"
import { MobileDiscussionCard } from "./MobileDiscussionCard"
import { MobileDiscussionComposer } from "./MobileDiscussionComposer"
import {
  listDiscussionsForReviewAsync,
  submitDiscussionAsync,
  type DiscussionType,
  type ReviewDiscussion,
} from "../lib/storage"

export type DiscussionSort = "useful" | "latest"

const SORT_LABELS: Record<DiscussionSort, string> = {
  useful: "热门",
  latest: "最新",
}

const DEFAULT_AUTHOR_LABEL = "菠萝探险家"
const DEFAULT_AUTHOR_ROLE = "anonymous" as const

export function MobileDiscussionSection({
  reviewId,
  companyId,
  initialDiscussions,
  autoOpenComposer = false,
}: {
  reviewId: string
  companyId: string
  initialDiscussions: ReviewDiscussion[]
  autoOpenComposer?: boolean
}) {
  const [items, setItems] = useState<ReviewDiscussion[]>(initialDiscussions)
  const [sort, setSort] = useState<DiscussionSort>("useful")
  const [composerOpen, setComposerOpen] = useState(autoOpenComposer)
  const [replyTo, setReplyTo] = useState<ReviewDiscussion | null>(null)

  useEffect(() => {
    if (autoOpenComposer) setComposerOpen(true)
  }, [autoOpenComposer])

  // Hydrate any locally persisted discussions on mount.
  useEffect(() => {
    let cancelled = false
    listDiscussionsForReviewAsync(reviewId).then((persisted) => {
      if (cancelled || persisted.length === 0) return
      setItems((current) => {
        const known = new Set(current.map((d) => d.id))
        const merged = [...current, ...persisted.filter((d) => !known.has(d.id))]
        return merged
      })
    })
    return () => {
      cancelled = true
    }
  }, [reviewId])

  const visibleItems = useMemo(
    () => items.filter((d) => d.status === "visible" || d.status === "limited_visible"),
    [items]
  )

  const myItems = useMemo(
    () => items.filter((d) => d.status === "pending_review" || d.status === "rejected" || d.status === "hidden"),
    [items]
  )

  const sorted = useMemo(() => {
    const list = [...visibleItems]
    if (sort === "latest") {
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    } else {
      list.sort((a, b) => b.usefulCount - a.usefulCount)
    }
    return list
  }, [visibleItems, sort])

  async function handleSubmit(payload: { type: DiscussionType; content: string }) {
    const item = await submitDiscussionAsync({
      reviewId,
      companyId,
      type: payload.type,
      authorLabel: DEFAULT_AUTHOR_LABEL,
      authorRole: DEFAULT_AUTHOR_ROLE,
      content: payload.content,
    })
    setItems((current) => [item, ...current])
    setComposerOpen(false)
    setReplyTo(null)
    setSort("latest")
  }

  function startReply(parent: ReviewDiscussion) {
    setReplyTo(parent)
    setComposerOpen(true)
  }

  const replyPrefix = replyTo
    ? `回复 @${replyTo.authorLabel}: `
    : ""

  return (
    <View style={S.section} testID="review-discussion-section">
      {/* Header */}
      <View style={S.header}>
        <View style={S.headerLeft}>
          <MessageCircle size={18} color={COLORS.ink} />
          <Text style={S.headerTitle}>
            评论 <Text style={S.headerCount}>{visibleItems.length}</Text>
          </Text>
        </View>
        <View style={S.sortRow}>
          {(Object.keys(SORT_LABELS) as DiscussionSort[]).map((key) => (
            <TouchableOpacity
              key={key}
              activeOpacity={0.85}
              onPress={() => setSort(key)}
              style={[S.sortPill, sort === key ? S.sortPillActive : null]}
              testID={`discussion-sort-${key}`}
            >
              <Text
                style={[S.sortPillText, sort === key ? S.sortPillTextActive : null]}
              >
                {SORT_LABELS[key]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Composer trigger / form */}
      {!composerOpen ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setComposerOpen(true)}
          style={S.composerTrigger}
          testID="discussion-trigger"
        >
          <View style={S.triggerAvatar}>
            <Text style={S.triggerAvatarText}>我</Text>
          </View>
          <Text style={S.triggerPlaceholder}>写下你的评论...</Text>
        </TouchableOpacity>
      ) : (
        <MobileDiscussionComposer
          defaultType={replyTo ? "追问" : "追问"}
          defaultContent={replyPrefix}
          onSubmit={handleSubmit}
          onCancel={() => {
            setComposerOpen(false)
            setReplyTo(null)
          }}
        />
      )}

      {/* Public discussion list */}
      <View testID="public-discussion-list">
        {sorted.length === 0 ? (
          <View style={S.empty} testID="discussion-empty">
            <Text style={S.emptyText}>还没有评论,来写第一条吧</Text>
          </View>
        ) : (
          sorted.map((item) => (
            <MobileDiscussionCard
              key={item.id}
              discussion={item}
              onReply={() => startReply(item)}
            />
          ))
        )}
      </View>

      {/* My status: pending / rejected / hidden */}
      {myItems.length > 0 ? (
        <View style={S.myStatus} testID="my-discussion-status-list">
          <Text style={S.myStatusTitle}>我的待处理内容</Text>
          <View style={S.myStatusList}>
            {myItems.map((item) => (
              <MobileDiscussionCard key={item.id} discussion={item} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  )
}

const S = StyleSheet.create({
  section: {
    borderRadius: RADIUS["2xl"],
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: `${COLORS.border}99`,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EFF1F2",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 15, fontWeight: "800", color: COLORS.ink },
  headerCount: { fontSize: 13, color: COLORS.muted, fontWeight: "700" },
  sortRow: { flexDirection: "row", gap: 4 },
  sortPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  sortPillActive: { backgroundColor: COLORS.dark },
  sortPillText: { fontSize: 12, fontWeight: "800", color: COLORS.muted },
  sortPillTextActive: { color: "#FFFFFF" },
  composerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EFF1F2",
    gap: 10,
  },
  triggerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  triggerAvatarText: { fontSize: 12, fontWeight: "900", color: COLORS.primaryForeground },
  triggerPlaceholder: { fontSize: 14, color: COLORS.muted },
  empty: { padding: 28, alignItems: "center" },
  emptyText: { fontSize: 13, color: COLORS.muted },
  myStatus: {
    borderTopWidth: 1,
    borderTopColor: "#EFF1F2",
    paddingVertical: 8,
  },
  myStatusTitle: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 6,
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.muted,
  },
  myStatusList: { gap: 0 },
})
