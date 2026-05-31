"use client"

import { useEffect, useRef, useState } from "react"

import { SolidButton } from "@/components/ui/solid-button"
import { Textarea } from "@/components/ui/textarea"
import { validateDiscussionContent } from "@/lib/content-guard"
import { clearDiscussionDraft, readDiscussionDraft, saveDiscussionDraft } from "@/lib/discussion-draft-storage"

type ComposerPayload = {
  content: string
}

export function ReviewDiscussionComposer({
  reviewId,
  companyId,
  onSubmit,
  onCancel,
}: {
  reviewId: string
  companyId: string
  onSubmit: (payload: ComposerPayload) => void
  onCancel?: () => void
}) {
  const [content, setContent] = useState("")
  const [error, setError] = useState("")
  const [feedback, setFeedback] = useState("")
  const [draftSaved, setDraftSaved] = useState(false)
  const [draftReady, setDraftReady] = useState(false)
  const didRestoreDraft = useRef(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = readDiscussionDraft(companyId, reviewId)
      if (draft?.content) {
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
          type: "question",
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
  }, [companyId, content, draftReady, reviewId])

  function submit() {
    const result = validateDiscussionContent(content)
    if (!result.ok) {
      setError(result.message ?? "内容包含不适合公开展示的信息，请调整后再发布。")
      setFeedback("")
      return
    }

    onSubmit({
      content: content.trim(),
    })
    setContent("")
    clearDiscussionDraft(companyId, reviewId)
    setDraftSaved(false)
    setError("")
    setFeedback("已发布")
  }

  return (
    <div className="space-y-3">
      <Textarea
        className="min-h-24 rounded-[22px] border border-[#E5E7DB]/70 bg-white px-4 py-3 text-sm leading-7 text-[#1F2937] shadow-[0_3px_0_rgba(17,24,39,0.035)] placeholder:text-[#9CA3AF] focus-visible:ring-[#19C37D]/35"
        data-testid="discussion-content-input"
        maxLength={300}
        onChange={(event) => {
          setContent(event.target.value)
          setError("")
          setFeedback("")
        }}
        placeholder="说点什么..."
        value={content}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#6B7280]">
          {content.length > 0 ? `${content.length}/300` : "想说就说，不要包含姓名、手机号等个人信息。"}
        </p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <SolidButton onClick={onCancel} size="sm" variant="ghost" type="button">
              取消
            </SolidButton>
          )}
          <SolidButton
            data-testid="discussion-submit-button"
            onClick={submit}
            type="button"
            variant="primary"
            disabled={!content.trim()}
          >
            发布
          </SolidButton>
        </div>
      </div>

      {error ? (
        <p data-testid="discussion-error" className="rounded-2xl bg-[#FFF1D6] px-3 py-2 text-sm font-medium text-[#92400E]">
          {error}
        </p>
      ) : null}
      {feedback ? <p className="text-sm font-medium text-[#07563A]">{feedback}</p> : null}
      {draftSaved && !feedback ? <p className="text-xs font-medium text-[#6B7280]">已自动保存草稿</p> : null}
    </div>
  )
}
