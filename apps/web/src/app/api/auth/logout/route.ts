import { NextResponse } from "next/server"
import { clearAuthCookie } from "@/lib/server/auth"

export async function POST() {
  await clearAuthCookie()
  return NextResponse.json({ success: true })
}
