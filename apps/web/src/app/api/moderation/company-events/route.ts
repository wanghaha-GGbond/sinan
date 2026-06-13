import { NextResponse } from "next/server"
import { z } from "zod"

import { companyEvents } from "@/db/schema/company-sentiment"
import { requireModerator } from "@/lib/server/auth"

const eventSchema = z.object({
  companyId: z.uuid(),
  eventDate: z.iso.date(),
  title: z.string().trim().min(2).max(80),
  category: z.enum(["裁员", "奖金", "组织调整", "融资", "产品发布", "其他"]),
  sourceUrl: z.url().nullable().optional(),
})

export async function POST(request: Request) {
  let moderator
  try {
    moderator = await requireModerator()
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }
  const parsed = eventSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "事件格式错误" }, { status: 400 })
  }
  try {
    const { db } = await import("@/db/client")
    const [event] = await db
      .insert(companyEvents)
      .values({
        ...parsed.data,
        sourceUrl: parsed.data.sourceUrl ?? null,
        createdByUserId: moderator.userId,
      })
      .returning({ id: companyEvents.id })
    return NextResponse.json({ event }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "事件保存失败" }, { status: 503 })
  }
}
