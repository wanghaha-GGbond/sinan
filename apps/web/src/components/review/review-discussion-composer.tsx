"use client"

import { useEffect, useRef, useState } from "react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { Textarea } from "@/components/ui/textarea"
import { validateDiscussionContent } from "@/lib/content-guard"
import { clearDiscussionDraft, readDiscussionDraft, saveDiscussionDraft } from "@/lib/discussion-draft-storage"
import type { ReviewDiscussionItem, ReviewDiscussionType } from "@/lib/types"

type ComposerPayload = Pick<ReviewDiscussionItem, "type" | "content" | "authorRole" | "authorLabel">

export function ReviewDiscussionComposer({
  reviewId,
  companyId,
  onSubmit,
}: {
  reviewId: string
  companyId: string
  onSubmit: (payload: ComposerPayload) => void
}) {
  const [type, setType] = useState<ReviewDiscussionType>("question")
  const [content, setContent] = useState("")
  const [error, setError] = useState("")
  const [feedback, setFeedback] = useState("")
  const [draftSaved, setDraftSaved] = useState(false)
  const [draftReady, setDraftReady] = useState(false)
  const didRestoreDraft = useRef(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = readDiscussionDraft(companyId, reviewId)
      if (draft) {
        setType(draft.type)
        setContent(draft.content)
        setDraftSaved(true)
      }
      didRestoreDraft.current = true
      setDraftReady(true)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [companyId, reviewId])

  useEffect(() => {
    if (!didRestoreDraft.current || !draftReady) return
    const timer = window.setTimeout(() => {
      if (content.trim()) {
        saveDiscussionDraft({
          reviewId,
          companyId,
          type,
          content,
          updatedAt: new Date().toISOString(),
        })
        setDraftSaved(true)
      } else {
        clearDiscussionDraft(companyId, reviewId)
        setDraftSaved(false)
      }
    }, 250)

    return () => window.clearTimeout(timer)
  }, [companyId, content, draftReady, reviewId, type])

  function submit() {
    const result = validateDiscussionContent(content)
    if (!result.ok) {
      setError(result.message ?? "内容包含不适合公开展示的信息，请调整后再发布。")
      setFeedback("")
      return
    }

    onSubmit({
      type,
      content: content.trim(),
      authorRole: type === "question" ? "job_seeker" : "anonymous",
      authorLabel: type === "question" ? "匿名求职者" : "匿名过来人",
    })
    setContent("")
    clearDiscussionDraft(companyId, reviewId)
    setDraftSaved(false)
    setError("")
    setFeedback("已发布，感谢你帮后来者补充信息")
  }

  return (
    <SolidCard variant="emerald" className="space-y-4 p-4">
      <div className="flex flex-wrap gap-2">
        <SolidButton
          data-testid="discussion-composer-question"
          onClick={() => {
            setType("question")
            setFeedback("")
          }}
          size="sm"
          type="button"
          variant={type === "question" ? "dark" : "secondary"}
        >
          我要追问
        </SolidButton>
        <SolidButton
          data-testid="discussion-composer-supplement"
          onClick={() => {
            setType("supplement")
            setFeedback("")
          }}
          size="sm"
          type="button"
          variant={type === "supplement" ? "dark" : "secondary"}
        >
          我要补充
        </SolidButton>
      </div>

      <Textarea
        className="min-h-28 rounded-[22px] border border-[#E5E7DB]/70 bg-white px-4 py-3 text-sm leading-7 text-[#1F2937] shadow-[0_3px_0_rgba(17,24,39,0.035)] placeholder:text-[#9CA3AF] focus-visible:ring-[#19C37D]/35"
        data-testid="discussion-content-input"
        maxLength={300}
        onChange={(event) => {
          setContent(event.target.value)
          setError("")
          setFeedback("")
        }}
        placeholder={
          type === "question"
            ? "比如：这个加班是整个公司都有，还是某些团队？"
            : "补充你的真实经历，帮助后来者判断。"
        }
        value={content}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#6B7280]">5-300 字，不要包含姓名、手机号、邮箱等可识别信息。</p>
        <SolidButton data-testid="discussion-submit-button" onClick={submit} type="button" variant="primary">
          发布
        </SolidButton>
      </div>

      {error ? (
        <p data-testid="discussion-error" className="rounded-2xl bg-[#FFF1D6] px-3 py-2 text-sm font-medium text-[#92400E]">
          {error}
        </p>
      ) : null}
      {feedback ? <p className="text-sm font-medium text-[#07563A]">{feedback}</p> : null}
      {draftSaved && !feedback ? <p className="text-xs font-medium text-[#6B7280]">已自动保存草稿</p> : null}
    </SolidCard>
  )
}
