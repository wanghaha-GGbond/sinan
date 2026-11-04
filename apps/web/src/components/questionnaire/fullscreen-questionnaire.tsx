"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { answersToReviewQuestionnaire, type QuestionnaireAnswerValue, type QuestionnaireSession, type QuestionnaireSessionAnswer } from "@/lib/questionnaire/question-bank"
import { WebButton } from "@/components/ui/web-button"
import type { ReviewQuestionnaire } from "@/lib/types"

export function FullscreenQuestionnaire({ open, session, values, onClose, onChange, onComplete }: {
  open: boolean
  session: QuestionnaireSession | null
  values?: ReviewQuestionnaire
  onClose: () => void
  onChange?: (questionnaire: ReturnType<typeof answersToReviewQuestionnaire>) => void
  onComplete: (payload: { questionnaire: ReturnType<typeof answersToReviewQuestionnaire>; answers: QuestionnaireSessionAnswer[] }) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [localAnswers, setAnswers] = useState<QuestionnaireSessionAnswer[]>([])
  const answers = values ? (session?.questions ?? []).flatMap(question => values[question.field] === undefined ? [] : [{ questionId: question.id, field: question.field, value: values[question.field]!, answeredAt: "" }]) : localAnswers
  const [done, setDone] = useState(false)
  const question = session?.questions[currentIndex]
  const total = session?.questions.length ?? 0
  const selected = answers.find(answer => answer.questionId === question?.id)?.value

  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal()
    else if (!open && dialog.current?.open) dialog.current.close()
  }, [open])
  useEffect(() => { if (open) heading.current?.focus() }, [currentIndex, done, open])

  if (!session) return null

  function select(value: QuestionnaireAnswerValue) {
    if (!question) return
    const next = [...answers.filter(answer => answer.questionId !== question.id), { questionId: question.id, field: question.field, value, answeredAt: new Date().toISOString() }]
    setAnswers(next)
    onChange?.({ [question.field]: value })
  }
  function advance(skip = false) {
    if (!question) return
    const next = skip ? answers.filter(answer => answer.questionId !== question.id) : answers
    if (skip) { setAnswers(next); onChange?.({ [question.field]: undefined }) }
    if (currentIndex === total - 1) {
      setDone(true)
      onComplete({ questionnaire: answersToReviewQuestionnaire(next), answers: next })
    } else setCurrentIndex(index => Math.min(index + 1, total - 1))
  }

  return <dialog ref={dialog} aria-labelledby="questionnaire-heading" onCancel={event => { event.preventDefault(); onClose() }} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto border-0 bg-background p-0 text-foreground backdrop:bg-black/50" data-testid="fullscreen-questionnaire">
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <WebButton type="button" variant="ghost" size="sm" onClick={onClose}><X className="size-4" />关闭</WebButton>
        <p className="text-sm text-muted-foreground" data-testid="questionnaire-status-pill">{done ? total : currentIndex + 1} / {total}</p>
      </div>
      <progress aria-label="问卷进度" className="my-5 h-2 w-full accent-primary" max={total || 1} value={done ? total : currentIndex} />
      {done ? <section className="my-auto rounded-xl border border-border bg-card p-6 sm:p-8" data-testid="questionnaire-complete-card">
        <h2 ref={heading} id="questionnaire-heading" tabIndex={-1} className="text-2xl font-semibold outline-none">问卷已填入草稿</h2>
        <p className="mt-3 text-sm text-muted-foreground">已回答 {answers.length} 题，提交评价后才会送审。</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <WebButton type="button" data-testid="questionnaire-complete-return-button" onClick={onClose}>回到评价</WebButton>
          <WebButton type="button" variant="secondary" onClick={() => { setDone(false); setCurrentIndex(0) }}>检查答案</WebButton>
        </div>
      </section> : question ? <section className="my-auto rounded-xl border border-border bg-card p-6 sm:p-8" data-testid="question-card">
        <p className="text-xs text-muted-foreground">{question.group === "office_experience" ? "办公体验" : "工作方式 · C-BTI"}</p>
        <h2 ref={heading} id="questionnaire-heading" tabIndex={-1} className="mt-3 text-xl font-semibold outline-none">{question.title}</h2>
        {question.description ? <p className="mt-2 text-sm text-muted-foreground">{question.description}</p> : null}
        <div className={question.type === "score_1_10" ? "mt-6 grid grid-cols-5 gap-2 sm:grid-cols-10" : "mt-6 grid gap-2"}>
          {(question.type === "score_1_10" ? Array.from({length: 10}, (_, i) => ({label: String(i + 1), value: i + 1})) : question.options ?? []).map(option =>
            <WebButton type="button" key={String(option.value)} data-testid="questionnaire-option-button" variant={selected === option.value ? "primary" : "secondary"} aria-pressed={selected === option.value} className="min-h-11 whitespace-normal text-left" onClick={() => select(option.value)}>{option.label}</WebButton>
          )}
        </div>
        <div className="mt-6 flex flex-wrap justify-between gap-2">
          <WebButton type="button" variant="ghost" disabled={currentIndex === 0} onClick={() => setCurrentIndex(index => index - 1)}>上一题</WebButton>
          <WebButton type="button" variant="ghost" data-testid="skip-question-button" onClick={() => advance(true)}>不了解 / 跳过</WebButton>
          <WebButton type="button" disabled={selected === undefined} onClick={() => advance()}>{currentIndex === total - 1 ? "完成问卷" : "下一题"}</WebButton>
        </div>
      </section> : null}
      <p className="mt-5 text-center text-xs text-muted-foreground">回答保留在当前评价草稿中，关闭后可继续填写。</p>
    </div>
  </dialog>
}
