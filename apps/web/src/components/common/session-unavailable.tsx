"use client"

import { ErrorState } from "@/components/common/error-state"
import { useAuth } from "@/lib/auth-context"

export function SessionUnavailable() {
  const { refresh } = useAuth()
  return <ErrorState title="暂时无法确认登录状态" message="请重试，无需重新登录。" showHome={false} onRetry={() => void refresh()} />
}
