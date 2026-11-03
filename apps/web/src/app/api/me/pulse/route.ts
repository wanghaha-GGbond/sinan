import { and, desc, eq, gte, isNull } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { pulseCheckins } from "@/db/schema/pulse-checkins"
import { users } from "@/db/schema/users"
import { requireAuthUser } from "@/lib/server/auth"
import { isPulseEnabled } from "@/lib/pulse-feature"
import { pulseDay, pulseInput, summarizePulse } from "@/lib/pulse"
import { checkPersistentRateLimit } from "@/lib/server/persistent-rate-limit"

const headers = { "Cache-Control": "private, no-store" }
const enabled = () => isPulseEnabled({ NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV, NEXT_PUBLIC_PULSE_ENABLED: process.env.NEXT_PUBLIC_PULSE_ENABLED })

export async function GET(request: NextRequest) {
  if (!enabled()) return NextResponse.json({ error: "Not found" }, { status: 404, headers })
  try {
    const user = await requireAuthUser(request)
    const { db } = await import("@/db/client")
    const now = new Date()
    const today = pulseDay(now)
    const start = pulseDay(new Date(now.getTime() - 6 * 86400_000))
    const records = await db.select({ day: pulseCheckins.day, energy: pulseCheckins.energy,
      pressure: pulseCheckins.pressure, workMinutes: pulseCheckins.workMinutes })
      .from(pulseCheckins).where(and(eq(pulseCheckins.userId, user.userId), gte(pulseCheckins.day, start)))
      .orderBy(desc(pulseCheckins.day)).limit(7)
    return NextResponse.json({ today, records, summary: summarizePulse(records) }, { headers })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ error: "记录暂时无法加载" }, { status: 503, headers })
  }
}

export async function POST(request: NextRequest) {
  if (!enabled()) return NextResponse.json({ error: "Not found" }, { status: 404, headers })
  // Cookie clients must submit from this origin. Native bearer clients do not use cookies.
  const origin = request.headers.get("origin")
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403, headers })
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "JSON required" }, { status: 415, headers })
  try {
    const user = await requireAuthUser(request)
    const text = await request.text()
    if (text.length > 2048) return NextResponse.json({ error: "Request too large" }, { status: 413, headers })
    const parsed = pulseInput.safeParse(JSON.parse(text))
    if (!parsed.success) return NextResponse.json({ error: "请检查分数和工时" }, { status: 400, headers })
    const limit = await checkPersistentRateLimit(`pulse:${user.userId}`, { maxRequests: 30, windowSeconds: 3600 })
    if (!limit.allowed) return NextResponse.json({ error: "请稍后再试" }, { status: limit.unavailable ? 503 : 429, headers: { ...headers, "Retry-After": String(limit.retryAfter) } })
    const { db } = await import("@/db/client")
    const record = await db.transaction(async tx => {
      // Serialize with account deletion; a request authenticated before deletion cannot recreate data.
      const [active] = await tx.select({ id: users.id }).from(users)
        .where(and(eq(users.id, user.userId), eq(users.status, "active"), isNull(users.deletedAt)))
        .for("update")
      if (!active) return null
      const day = pulseDay()
      const values = { ...parsed.data, updatedAt: new Date() }
      const [saved] = await tx.insert(pulseCheckins).values({ userId: user.userId, day, ...values })
        .onConflictDoUpdate({ target: [pulseCheckins.userId, pulseCheckins.day], set: values })
        .returning({ day: pulseCheckins.day, energy: pulseCheckins.energy, pressure: pulseCheckins.pressure, workMinutes: pulseCheckins.workMinutes })
      return saved
    })
    if (!record) return NextResponse.json({ error: "Authentication required" }, { status: 401, headers })
    return NextResponse.json({ record }, { headers })
  } catch (error) {
    if (error instanceof Response) return error
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers })
    return NextResponse.json({ error: "保存失败，请重试" }, { status: 503, headers })
  }
}
