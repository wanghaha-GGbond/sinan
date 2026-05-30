import { AlertCircle, Inbox, Loader2 } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

export function LoadingState({ title = "正在读取方向样本" }: { title?: string }) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="animate-spin" />
        {title}
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  )
}

export function EmptyState({
  title = "还没有足够样本",
  description = "你可以发布一条匿名体验，帮助后来者判断方向。",
}: {
  title?: string
  description?: string
}) {
  return (
    <Empty className="min-h-56 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function ErrorState({
  title = "读取失败",
  description = "当前 mock query 返回异常，请稍后重试。",
}: {
  title?: string
  description?: string
}) {
  return (
    <Empty className="min-h-56 border border-destructive/30">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <AlertCircle />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
