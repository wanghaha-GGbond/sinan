export type ServerErrorEvent = {
  service: "sinan-web"
  environment: string
  release: string
  occurredAt: string
  message: string
  digest?: string
  method: string
  path: string
  routePath: string
  routeType: string
}

function safePath(path: string) {
  return path.split("?", 1)[0].slice(0, 500)
}

export function createServerErrorEvent(input: {
  error: Error & { digest?: string }
  request: { method: string; path: string }
  context: { routePath: string; routeType: string }
  now?: Date
}): ServerErrorEvent {
  return {
    service: "sinan-web",
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? "unknown",
    release: process.env.APP_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
    occurredAt: (input.now ?? new Date()).toISOString(),
    message: input.error.message.slice(0, 1000),
    digest: input.error.digest,
    method: input.request.method.slice(0, 16),
    path: safePath(input.request.path),
    routePath: input.context.routePath.slice(0, 500),
    routeType: input.context.routeType,
  }
}

export async function reportServerError(event: ServerErrorEvent) {
  // JSON logs remain useful on every hosting provider and are deliberately
  // free of request headers, bodies, cookies, query strings and stack traces.
  console.error(JSON.stringify({ level: "error", event: "server_request_error", ...event }))

  const webhook = process.env.ERROR_REPORTING_WEBHOOK
  if (!webhook) return

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (process.env.ERROR_REPORTING_TOKEN) {
    headers.Authorization = `Bearer ${process.env.ERROR_REPORTING_TOKEN}`
  }

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers,
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(3_000),
    })
    if (!response.ok) {
      console.error(JSON.stringify({
        level: "error",
        event: "error_reporting_delivery_failed",
        status: response.status,
      }))
    }
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      event: "error_reporting_delivery_failed",
      reason: error instanceof Error ? error.name : "unknown",
    }))
  }
}
