import { useEffect, useMemo, useState } from "react"
import { Alert, View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Link, router } from "expo-router"

import { MobileReview } from "../data"
import { ApiError, ReviewListItem, setReviewUseful } from "../lib/api"
import { COLORS } from "../theme"
import { isReviewUsefulAsync, toggleReviewUsefulAsync } from "../lib/storage"
import { SolidButton } from "./SolidButton"
import { SolidCard } from "./SolidCard"
import { ScoreChip, TagPill } from "./SinanPrimitives"
import { MobileReportButton } from "./MobileReportButton"
import { MobileBlockAuthorButton } from "./MobileBlockAuthorButton"

type ReviewCardReview = MobileReview | ReviewListItem

function isRemoteReview(review: ReviewCardReview): review is ReviewListItem {
  return typeof review.directionScore === "string" || "publicAuthor" in review
}

function formatRemoteDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("zh-CN")
}

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
  showDiscussionAction = true,
  onBlocked,
  onAuthRequired,
}: {
  review: ReviewCardReview
  companyId: string
  expanded?: boolean
  showDetailLink?: boolean
  showDiscussionAction?: boolean
  onBlocked?: () => void
  onAuthRequired?: () => void
}) {
  const remote = isRemoteReview(review)
  const [liked, setLiked] = useState(remote ? Boolean(review.isUsefulByCurrentUser) : false)
  const [likeCount, setLikeCount] = useState(review.usefulCount)
  const [isExpanded, setIsExpanded] = useState(expanded)
  const [busy, setBusy] = useState(false)
  const normalized = useMemo(() => {
    const content = review.content ?? ""
    if (remote) {
      const verification = review.publicAuthor?.verificationLevel ?? "none"
      return {
        content,
        title: review.summary || review.title,
        score: Number(review.directionScore) || 0,
        employment: review.employmentStatus || "匿名贡献者",
        role: review.jobTitle || review.authorRole,
        city: review.city || "",
        createdAt: formatRemoteDate(review.createdAt),
        verified: Boolean(review.publicAuthor?.verifiedForCompany),
        trustLevel: verification === "L2" ? 2 : verification === "L1" ? 1 : 0,
        tags: review.tags ?? [],
      }
    }
    return {
      content,
      title: review.shortComment ?? review.title,
      score: review.directionScore,
      employment: review.employmentStatus,
      role: review.authorRole,
      city: review.city,
      createdAt: review.createdAt,
      verified: Boolean(review.verified),
      trustLevel: review.trustLevel ?? 0,
      tags: review.tags,
    }
  }, [remote, review])
  const isLong = useMemo(() => normalized.content.replace(/\s/g, "").length > 180, [normalized.content])

  useEffect(() => {
    if (remote) {
      setLiked(Boolean(review.isUsefulByCurrentUser))
      setLikeCount(review.usefulCount)
      return
    }
    let cancelled = false
    isReviewUsefulAsync(review.id).then((value) => {
      if (!cancelled) setLiked(value)
    })
    return () => {
      cancelled = true
    }
  }, [remote, review])

  function requireAuth() {
    if (onAuthRequired) onAuthRequired()
    else router.push({ pathname: "/login", params: { next: `/company/${companyId}` } })
  }

  async function handleToggleUseful() {
    if (busy) return
    setBusy(true)
    try {
      if (remote) {
        const result = await setReviewUseful(review.id, !liked)
        setLiked(result.isUsefulByCurrentUser)
        setLikeCount(result.usefulCount)
      } else {
        const next = await toggleReviewUsefulAsync(review.id)
        setLiked(next)
        setLikeCount((current) => Math.max(0, current + (next ? 1 : -1)))
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) requireAuth()
      else Alert.alert("暂时无法操作", "请检查网络后重试。")
    } finally {
      setBusy(false)
    }
  }

  return (
    <SolidCard variant="subtle" style={S.card}>
      <View style={S.inner}>
        <View style={S.head}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={S.meta}>
              匿名评价者 · L{normalized.trustLevel} · {normalized.employment}
              {normalized.verified ? " · 已验证员工" : ""}
            </Text>
            <Text style={S.title} numberOfLines={2}>{normalized.title}</Text>
          </View>
          <ScoreChip score={normalized.score} compact />
        </View>

        <Text style={S.content} numberOfLines={isLong && !isExpanded ? 5 : undefined}>
          {normalized.content || "这条评价暂未补充文字内容。"}
        </Text>
        {isLong ? (
          <TouchableOpacity onPress={() => setIsExpanded((previous) => !previous)} accessibilityRole="button">
            <Text style={S.linkText}>{isExpanded ? "收起" : "展开全文"}</Text>
          </TouchableOpacity>
        ) : null}
        {showDetailLink ? (
          <Link href={`/company/${companyId}/reviews/${review.id}`} asChild>
            <TouchableOpacity accessibilityRole="link">
              <Text style={S.linkText}>阅读全文</Text>
            </TouchableOpacity>
          </Link>
        ) : null}

        {normalized.tags.length > 0 ? (
          <View style={S.tags}>
            {normalized.tags.map((tag) => (
              <TagPill key={tag} tone={tagTone(tag)}>#{tag}</TagPill>
            ))}
          </View>
        ) : null}

        <Text style={S.footMeta}>{normalized.role}{normalized.city ? ` · ${normalized.city}` : ""} · {normalized.createdAt}</Text>

        <View style={S.actions}>
          <SolidButton
            title={`有用 ${likeCount}`}
            variant={liked ? "primary" : "secondary"}
            size="sm"
            disabled={busy}
            onPress={() => void handleToggleUseful()}
            testID={`useful-review-${review.id}`}
          />
          {showDiscussionAction ? (
            <Link
              href={{
                pathname: `/company/${companyId}/reviews/${review.id}`,
                params: { focus: "discussion" },
              }}
              asChild
            >
              <TouchableOpacity testID={`review-card-reply-${review.id}`} accessibilityRole="link">
                <View><SolidButton title={`回复 ${review.discussionCount}`} variant="secondary" size="sm" /></View>
              </TouchableOpacity>
            </Link>
          ) : null}
          <MobileReportButton reviewId={review.id} mode={remote ? "remote" : "local"} onAuthRequired={requireAuth} />
          {remote ? (
            <MobileBlockAuthorButton reviewId={review.id} onBlocked={onBlocked} onAuthRequired={requireAuth} />
          ) : null}
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
