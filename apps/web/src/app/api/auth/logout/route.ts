import { NextResponse } from "next/server"
import { clearAuthCookie } from "@/lib/server/auth"
import { checkAuthWriteRequest } from "@/lib/server/auth-request"

export async function POST(request: Request) {
  const denied = checkAuthWriteRequest(request, false)
  if (denied) return denied
  await clearAuthCookie()
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "private, no-store" } })
}
