import { NextResponse } from "next/server"
import { and, asc, eq } from "drizzle-orm"

import { departments } from "@/db/schema/departments"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { db } = await import("@/db/client")
    const rows = await db
      .select({
        id: departments.id,
        name: departments.name,
      })
      .from(departments)
      .where(and(eq(departments.companyId, id), eq(departments.status, "active")))
      .orderBy(asc(departments.name))

    return NextResponse.json({ departments: rows })
  } catch {
    return NextResponse.json({ departments: [] })
  }
}
