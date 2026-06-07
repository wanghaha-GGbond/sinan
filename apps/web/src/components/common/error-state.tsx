"use client"

import { AlertCircle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"

export function ErrorState({
  title = "出了点问题",
  message = "网络有点不通畅,刷新一下试试。",
  onRetry,
  showHome = true,
}: {
  title?: string
  message?: string
  onRetry?: () => void
  showHome?: boolean
}) {
  const router = useRouter()
  // If the parent passed a function prop, use it. Otherwise
  // default to router.refresh() (re-runs the server component
  // for this route without a full reload). This means a server
  // parent no longer needs to pass onRetry at all — the
  // client side just revalidates the route.
  const handleRetry = onRetry ?? (() => router.refresh())
  return (
    <section className="mx-auto flex w-full max-w-section flex-col items-center px-4 py-20 sm:py-24">
      <SolidCard variant="subtle" className="w-full p-8 text-center" data-testid="error-state">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle className="size-6 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <SolidButton onClick={handleRetry} variant="primary" size="md" data-testid="error-retry">
            <RefreshCw className="size-4" />
            重试
          </SolidButton>
          {showHome ? (
            <SolidButton asChild variant="secondary" size="md" data-testid="error-home">
              <Link href="/">
                <Home className="size-4" />
                回到推荐流
              </Link>
            </SolidButton>
          ) : null}
        </div>
      </SolidCard>
    </section>
  )
}
