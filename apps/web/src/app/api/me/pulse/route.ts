import { and, desc, eq, gte, isNull, lte } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { pulseCheckins } from "@/db/schema/pulse-checkins"
import { users } from "@/db/schema/users"
import { requireAuthUser } from "@/lib/server/auth"
import { isPulseEnabled } from "@/lib/pulse-feature"
import { pulseDay, pulseInput, pulseWeekStart, shiftPulseDay, summarizePulse } from "@/lib/pulse"
import { eligiblePulseCompanies } from "@/lib/server/pulse-company"
import { checkPersistentRateLimit } from "@/lib/server/persistent-rate-limit"

const headers = { "Cache-Control": "private, no-store" }
const enabled = () => isPulseEnabled({ NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV, NEXT_PUBLIC_PULSE_ENABLED: process.env.NEXT_PUBLIC_PULSE_ENABLED })

async function readInput(request: NextRequest) {
  const reader = request.body?.getReader()
  if (!reader) throw new SyntaxError("Missing body")
  const chunks: Uint8Array[] = []; let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > 2048) { await reader.cancel(); throw new Response("Request too large", { status: 413, headers }) }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size); let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return JSON.parse(new TextDecoder().decode(bytes))
}

export async function GET(request: NextRequest) {
  if (!enabled()) return NextResponse.json({ error: "Not found" }, { status: 404, headers })
  try {
    const user = await requireAuthUser(request)
    const { db } = await import("@/db/client")
    const now = new Date()
    const today = pulseDay(now)
    const lastSeven = shiftPulseDay(today, -6), monthStart = today.slice(0, 7) + "-01", weekStart = pulseWeekStart(today)
    const start = [lastSeven, monthStart, weekStart].sort()[0]
    const [allRecords, eligibleCompanies] = await Promise.all([
      db.select({ day: pulseCheckins.day, energy: pulseCheckins.energy,
        pressure: pulseCheckins.pressure, workMinutes: pulseCheckins.workMinutes,
        endMinute: pulseCheckins.endMinute, companyId: pulseCheckins.companyId })
        .from(pulseCheckins).where(and(eq(pulseCheckins.userId, user.userId), gte(pulseCheckins.day, start), lte(pulseCheckins.day, today)))
        .orderBy(desc(pulseCheckins.day)).limit(38),
      eligiblePulseCompanies(user.userId),
    ])
    const records = allRecords.filter(record => record.day >= lastSeven)
    return NextResponse.json({ today, records, summary: summarizePulse(records), eligibleCompanies,
      week: summarizePulse(allRecords.filter(record => record.day >= weekStart)),
      month: summarizePulse(allRecords.filter(record => record.day >= monthStart)) }, { headers })
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
    const parsed = pulseInput.safeParse(await readInput(request))
    if (!parsed.success) return NextResponse.json({ error: "请检查分数和工时" }, { status: 400, headers })
    const limit = await checkPersistentRateLimit(`pulse:${user.userId}`, { maxRequests: 30, windowSeconds: 3600 })
    if (!limit.allowed) return NextResponse.json({ error: "请稍后再试" }, { status: limit.unavailable ? 503 : 429, headers: { ...headers, "Retry-After": String(limit.retryAfter) } })
    const { db } = await import("@/db/client")
    const { shareWithCompany, companyId: requestedCompany, ...answers } = parsed.data
    if (shareWithCompany && (!requestedCompany || !(await eligiblePulseCompanies(user.userId)).some(company => company.id === requestedCompany))) {
      return NextResponse.json({ error: "请先完成这家公司的身份认证，再参与匿名统计" }, { status: 403, headers })
    }
    const record = await db.transaction(async tx => {
      // Serialize with account deletion; a request authenticated before deletion cannot recreate data.
      const [active] = await tx.select({ id: users.id }).from(users)
        .where(and(eq(users.id, user.userId), eq(users.status, "active"), isNull(users.deletedAt)))
        .for("update")
      if (!active) return null
      const day = pulseDay()
      const values = { ...answers, companyId: shareWithCompany ? requestedCompany : null, updatedAt: new Date() }
      const [saved] = await tx.insert(pulseCheckins).values({ userId: user.userId, day, ...values })
        .onConflictDoUpdate({ target: [pulseCheckins.userId, pulseCheckins.day], set: values })
        .returning({ day: pulseCheckins.day, energy: pulseCheckins.energy, pressure: pulseCheckins.pressure, workMinutes: pulseCheckins.workMinutes, endMinute: pulseCheckins.endMinute, companyId: pulseCheckins.companyId })
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

export async function DELETE(request: NextRequest) {
  if (!enabled()) return NextResponse.json({ error: "Not found" }, { status: 404, headers })
  const origin = request.headers.get("origin")
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403, headers })
  if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "JSON required" }, { status: 415, headers })
  try {
    const user = await requireAuthUser(request)
    const body = await readInput(request)
    if (body?.confirmation !== "DELETE_MY_PULSE") return NextResponse.json({ error: "请确认清除个人记录" }, { status: 400, headers })
    const { db } = await import("@/db/client")
    await db.transaction(async tx => {
      await tx.select({ id: users.id }).from(users).where(eq(users.id, user.userId)).for("update")
      await tx.delete(pulseCheckins).where(eq(pulseCheckins.userId, user.userId))
    })
    return NextResponse.json({ success: true }, { headers })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ error: "清除失败，请重试" }, { status: error instanceof SyntaxError ? 400 : 503, headers })
  }
}
