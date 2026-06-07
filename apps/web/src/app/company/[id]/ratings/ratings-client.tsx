"use client"

import Link from "next/link"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Compass, PenLine, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { EmptyState, ErrorState, LoadingState } from "@/components/common/state-blocks"
import { ReviewCard } from "@/components/review/review-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SolidButton } from "@/components/ui/solid-button"
import { Textarea } from "@/components/ui/textarea"
import { getCompany } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

function explainScore(score: number) {
  if (score >= 9) return "强烈推荐，较少明显风险"
  if (score >= 8) return "整体较好，适合重点考虑"
  if (score >= 7) return "可以考虑，但要看具体岗位"
  if (score >= 6) return "机会与风险并存"
  if (score >= 5) return "不确定性较高"
  if (score >= 4) return "风险较明显"
  return "高风险，建议谨慎"
}

const scoreOptions = Array.from({ length: 11 }, (_, index) => index)

export function RatingsClient({ id }: { id: string }) {
  const { data: company, isLoading, isError } = useQuery({
    queryKey: ["company-ratings", id],
    queryFn: async () => getCompany(id),
  })
  const [score, setScore] = useState<number | null>(null)
  const [note, setNote] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [open, setOpen] = useState(false)

  if (isLoading) {
    return <LoadingState title="正在读取公司评价" />
  }

  if (isError || !company) {
    return <ErrorState />
  }

  const displayedScore = score ?? company.directionScore
  const noteLimit = 80

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">
        <div className="solid-card mb-5 border border-border/60 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{company.name}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                真实评价
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                这里优先展示这家公司下面的匿名体验。方向分只是辅助判断，真正有用的信息在评论里。
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {company.vibeTag ? (
                  <Badge variant="secondary" data-testid="ratings-vibe-tag">
                    公司体感 {company.vibeTag.name}
                  </Badge>
                ) : null}
                {company.riskTags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-muted px-4 py-3">
              <div>
                <p className="text-xs text-muted-foreground">方向分</p>
                <p className="text-2xl font-semibold">{company.directionScore.toFixed(1)}</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-xs text-muted-foreground">真实体验</p>
                <p className="text-2xl font-semibold">{company.reviewCount.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {company.reviews.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4">
            {company.reviews.map((review) => (
              <ReviewCard key={review.id} review={review} companyId={company.id} />
            ))}
          </div>
        )}
      </div>

      <aside className="grid gap-4 self-start lg:sticky lg:top-20">
        <Card className="solid-card-subtle border border-border/60">
          <CardHeader>
            <CardTitle>给这家公司打个方向分</CardTitle>
            <CardDescription>可选。提交后只在本地模拟成功状态。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-6 gap-2">
              {scoreOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  data-testid={`score-option-${item}`}
                  onClick={() => setScore(item)}
                  className={cn(
                    "h-9 rounded-full border text-sm font-medium transition-all active:translate-y-[2px]",
                    score === item
                      ? "border-primary bg-primary-hover text-primary-foreground shadow-[0_3px_0_var(--primary-deep)]"
                      : "bg-muted text-foreground shadow-[0_3px_0_#D1D5C8] hover:bg-[var(--tw-mute)]"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="rounded-2xl bg-muted p-3">
              <p className="text-sm text-muted-foreground">你的方向分</p>
              <p data-testid="preview-score" className="mt-1 text-2xl font-semibold">
                {displayedScore.toFixed(1)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {explainScore(displayedScore)}
              </p>
            </div>
            {score !== null ? (
              <div className="grid gap-2">
                <Textarea
                  data-testid="rating-note"
                  value={note}
                  maxLength={noteLimit}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="一句话补充：写事实，不写可识别个人身份的信息。"
                />
                <p className="text-right text-xs text-muted-foreground">
                  {note.length}/{noteLimit}
                </p>
              </div>
            ) : null}
            <div className="rounded-2xl bg-risk-surface p-3 text-sm text-destructive">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 shrink-0" />
                <p className="text-muted-foreground">
                  提交前请确认没有姓名、工号、手机号、住址等个人身份信息。
                </p>
              </div>
            </div>
            <SolidButton
              data-testid="submit-rating"
              variant="primary"
              onClick={() => {
                setSubmitted(true)
                setOpen(true)
                toast.success("你为后来者点亮了一次方向")
              }}
            >
              提交方向分
            </SolidButton>
            <SolidButton asChild variant="secondary">
              <Link href="/submit/review">
                <PenLine />
                写完整评价
              </Link>
            </SolidButton>
            {submitted ? (
              <div data-testid="rating-reward" className="glass-emerald rounded-[24px] p-3 text-sm">
                <p className="font-medium text-primary-deep">你为后来者点亮了一次方向</p>
                <p className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1 text-primary-deep">
                  <span>方向值 +20</span>
                  <span>连续点灯 +1</span>
                </p>
                <p className="mt-1 text-xs text-primary-deep">评价等待审核中</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </aside>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>方向评分已记录</DialogTitle>
            <DialogDescription>
              当前为 MVP mock 状态。正式版本会先做匿名保护和真实性校验，再进入样本统计。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <SolidButton onClick={() => setOpen(false)}>
              <Compass />
              继续看真实评价
            </SolidButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
