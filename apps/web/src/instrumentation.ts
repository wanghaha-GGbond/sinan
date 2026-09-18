import type { Instrumentation } from "next"

import {
  createServerErrorEvent,
  reportServerError,
} from "@/lib/server/error-reporting"

export function register() {
  console.info(JSON.stringify({
    level: "info",
    event: "service_started",
    service: "zaichang",
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? "unknown",
    release: process.env.APP_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
  }))
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  const normalizedError = error instanceof Error
    ? error as Error & { digest?: string }
    : new Error("Unknown server request error")
  await reportServerError(createServerErrorEvent({ error: normalizedError, request, context }))
}
