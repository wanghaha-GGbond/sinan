"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { X } from "lucide-react"

import {
  answersToReviewQuestionnaire,
  type QuestionnaireAnswerValue,
  type QuestionnaireSession,
  type QuestionnaireSessionAnswer,
} from "@/lib/questionnaire/question-bank"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"

export function FullscreenQuestionnaire({
  open,
  session,
  onClose,
  onComplete,
}: {
  open: boolean
  session: QuestionnaireSession | null
  onClose: () => void
  onComplete: (payload: {
    questionnaire: ReturnType<typeof answersToReviewQuestionnaire>
    answers: QuestionnaireSessionAnswer[]
  }) => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<QuestionnaireSessionAnswer[]>([])
  const [feedback, setFeedback] = useState("")
  const [done, setDone] = useState(false)

  const currentQuestion = session?.questions[currentIndex]
  const total = session?.questions.length ?? 0
  const progress = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0

  const scoreOptions = useMemo(() => Array.from({ length: 10 }, (_, idx) => idx + 1), [])

  if (!open || !session) return null

  function commitAnswer(value: QuestionnaireAnswerValue, fb?: string) {
    if (!currentQuestion) return
    const nextAnswers = [
      ...answers.filter((item) => item.questionId !== currentQuestion.id),
      {
        questionId: currentQuestion.id,
        field: currentQuestion.field,
        value,
        answeredAt: new Date().toISOString(),
      },
    ]
    setAnswers(nextAnswers)
    setFeedback(fb ?? "已记录，这会帮助后来者判断日常体验。")
    window.setTimeout(() => {
      if (currentIndex >= total - 1) {
        setDone(true)
        onComplete({ questionnaire: answersToReviewQuestionnaire(nextAnswers), answers: nextAnswers })
      } else {
        setCurrentIndex((prev) => prev + 1)
      }
      setFeedback("")
    }, 220)
  }

  function skipQuestion() {
    if (currentIndex >= total - 1) {
      setDone(true)
      onComplete({ questionnaire: answersToReviewQuestionnaire(answers), answers })
      return
    }
    setCurrentIndex((prev) => Math.min(prev + 1, total - 1))
  }

  return (
    <div className="fixed inset-0 z-[80] bg-background" data-testid="fullscreen-questionnaire">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 py-4 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <SolidButton variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" />
            关闭
          </SolidButton>
          <p className="text-sm text-muted-foreground" data-testid="questionnaire-status-pill">
            {Math.min(currentIndex + 1, total)} / {total}
          </p>
        </div>
        <div className="mb-5 h-3 rounded-full bg-[#E5E7DB]" data-testid="question-progress">
          <motion.div
            className="h-3 rounded-full bg-primary"
            initial={false}
            animate={{ width: `${done ? 100 : progress}%` }}
            transition={{ duration: 0.22 }}
          />
        </div>

        {done ? (
          <SolidCard variant="emerald" className="my-auto p-8 text-center" data-testid="questionnaire-complete-card">
            <h2 className="text-2xl font-semibold text-secondary-foreground">办公体验已记录</h2>
            <p className="mt-2 text-sm text-secondary-foreground">你补充的结构化信息，会帮助后来者更快判断这家公司。</p>
            <p className="mt-4 flex flex-wrap gap-x-2.5 gap-y-1 text-lg font-semibold text-primary-deep">
              <span>方向值 +8</span>
              <span>办公体验贡献 +1</span>
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <SolidButton variant="secondary" data-testid="questionnaire-complete-return-button" onClick={onClose}>
                回到评价
              </SolidButton>
            </div>
          </SolidCard>
        ) : currentQuestion ? (
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="my-auto"
          >
            <SolidCard variant="default" className="p-6 sm:p-8" data-testid="question-card">
              <p className="text-sm text-muted-foreground">补充办公体验问卷</p>
              <h2 className="mt-2 text-xl font-semibold text-foreground sm:text-2xl">{currentQuestion.title}</h2>
              {currentQuestion.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{currentQuestion.description}</p>
              ) : null}
              <div className="mt-6 space-y-3">
                {currentQuestion.type === "score_1_10" ? (
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                    {scoreOptions.map((value) => (
                      <SolidButton
                        key={value}
                        data-testid="questionnaire-option-button"
                        variant="secondary"
                        size="sm"
                        className="justify-center rounded-[18px]"
                        onClick={() => commitAnswer(value, "已记录，这是一条很有用的信号。")}
                      >
                        {value}
                      </SolidButton>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {currentQuestion.options?.map((option) => (
                      <SolidButton
                        key={String(option.value)}
                        data-testid="questionnaire-option-button"
                        variant="secondary"
                        className="justify-start rounded-[20px] py-3 text-left"
                        onClick={() => commitAnswer(option.value, option.feedback)}
                      >
                        {option.label}
                      </SolidButton>
                    ))}
                  </div>
                )}
              </div>
              {feedback ? <p className="mt-4 text-sm font-medium text-primary-deep">{feedback}</p> : null}
              <div className="mt-6 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">回答会自动保存，可随时退出。</p>
                <SolidButton variant="ghost" size="sm" data-testid="skip-question-button" onClick={skipQuestion}>
                  跳过本题
                </SolidButton>
              </div>
            </SolidCard>
          </motion.div>
        ) : null}
      </div>
    </div>
  )
}
