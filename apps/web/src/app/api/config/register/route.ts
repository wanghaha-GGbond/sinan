import { NextResponse } from "next/server"

export async function GET() {
  const flag = process.env.INVITE_REQUIRED?.trim().toLowerCase()
  return NextResponse.json({
    inviteRequired: flag === "1" || flag === "true",
  })
}
