import { NextResponse } from "next/server"

/** Browser auth writes require same-origin JSON. Native clients may omit Origin,
 * but a spoofed client header never exempts a foreign browser origin. */
export function checkAuthWriteRequest(request: Request, json = true): NextResponse | null {
  const headers = { "Cache-Control": "private, no-store" }
  const origin = request.headers.get("origin")
  const site = request.headers.get("sec-fetch-site")
  if (site === "cross-site" || (!origin && site === "same-site")) {
    return NextResponse.json({ error: "请从本站提交" }, { status: 403, headers })
  }
  if (origin) {
    try {
      const source = new URL(origin), target = new URL(request.url)
      const host = request.headers.get("host")
      const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(source.hostname)
      const sameOrigin = source.origin === origin && ["http:", "https:"].includes(source.protocol) &&
        (source.origin === target.origin || (source.host === host && (source.protocol === "https:" || (loopback && source.protocol === "http:"))))
      if (!sameOrigin) throw new Error("Foreign origin")
    } catch {
      return NextResponse.json({ error: "请从本站提交" }, { status: 403, headers })
    }
  }
  if (json && request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ error: "请使用 JSON 提交" }, { status: 415, headers })
  }
  return null
}
