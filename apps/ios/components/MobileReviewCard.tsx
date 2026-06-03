import { useEffect, useMemo, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Link } from "expo-router"
import { MobileReview } from "../data"
import { COLORS } from "../theme"
import { isReviewUsefulAsync, toggleReviewUsefulAsync } from "../lib/storage"
import { SolidButton } from "./SolidButton"
import { SolidCard } from "./SolidCard"
import { ScoreChip, TagPill } from "./SinanPrimitives"
import { MobileReportButton } from "./MobileReportButton"

function tagTone(tag: string): "risk" | "positive" | "neutral" {
  if (/(风险|慎重|压力|加班|不确定|波动|限制|慢|消耗)/.test(tag)) return "risk"
  if (/(成熟|稳定|清晰|不错|含金量|透明|成长|高|认真)/.test(tag)) return "positive"
  return "neutral"
}

export function MobileReviewCard({
  review,
  companyId,
  expanded = false,
  showDetailLink = true,
}: {
  review: MobileReview
  companyId: string
  expanded?: boolean
  showDetailLink?: boolean
}) {
  const [liked, setLiked] = useState(false)
  const [isExpanded, setIsExpanded] = useState(expanded)
  const isLong = useMemo(() => review.content.replace(/\s/g, "").length > 180, [review.content])
  const likeCount = review.usefulCount + (liked ? 1 : 0)

  // Hydrate persisted "useful" state after mount.
  useEffect(() => {
    let cancelled = false
    isReviewUsefulAsync(review.id).then((v) => {
      if (!cancelled) setLiked(v)
    })
    return () => {
      cancelled = true
    }
  }, [review.id])

  async function handleToggleUseful() {
    const next = await toggleReviewUsefulAsync(review.id)
    setLiked(next)
  }

  return (
    <SolidCard variant="subtle" style={S.card}>
      <View style={S.inner}>
        <View style={S.head}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={S.meta}>
              匿名评价者 · L{review.trustLevel ?? 3} · {review.employmentStatus}
              {review.verified ? " · 已验证员工" : ""}
            </Text>
            <Text style={S.title} numberOfLines={2}>{review.shortComment ?? review.title}</Text>
          </View>
          <ScoreChip score={review.directionScore} compact />
        </View>

        <Text style={S.content} numberOfLines={isLong && !isExpanded ? 5 : undefined}>{review.content}</Text>
        {isLong ? (
          <TouchableOpacity onPress={() => setIsExpanded((prev) => !prev)}>
            <Text style={S.linkText}>{isExpanded ? "收起" : "展开全文"}</Text>
          </TouchableOpacity>
        ) : null}
        {showDetailLink ? (
          <Link href={`/company/${companyId}/reviews/${review.id}`} asChild>
            <TouchableOpacity>
              <Text style={S.linkText}>阅读全文</Text>
            </TouchableOpacity>
          </Link>
        ) : null}

        <View style={S.tags}>
          {review.tags.map((tag) => (
            <TagPill key={tag} tone={tagTone(tag)}>#{tag}</TagPill>
          ))}
        </View>

        <Text style={S.footMeta}>{review.authorRole} · {review.city} · {review.createdAt}</Text>

        <View style={S.actions}>
          <SolidButton
            title={`有用 ${likeCount}`}
            variant={liked ? "primary" : "secondary"}
            size="sm"
            onPress={handleToggleUseful}
          />
          <Link href={`/company/${companyId}/reviews/${review.id}`} asChild>
            <TouchableOpacity>
              <View>
                <SolidButton title={`回复 ${review.discussionCount}`} variant="secondary" size="sm" />
              </View>
            </TouchableOpacity>
          </Link>
          <MobileReportButton reviewId={review.id} />
        </View>
      </View>
    </SolidCard>
  )
}

const S = StyleSheet.create({
  card: { padding: 18 },
  inner: { gap: 13 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  meta: { fontSize: 12, color: COLORS.muted, lineHeight: 18 },
  title: { marginTop: 4, fontSize: 16, fontWeight: "800", lineHeight: 22, color: COLORS.ink },
  content: { fontSize: 14, lineHeight: 24, color: "#334155" },
  linkText: { fontSize: 13, fontWeight: "800", color: COLORS.primaryDark },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  footMeta: { fontSize: 12, color: COLORS.muted },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
})
