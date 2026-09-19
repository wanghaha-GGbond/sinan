import { NextResponse } from "next/server"

import { isInviteRequired } from "@/lib/server/invites"

export async function GET() {
  return NextResponse.json({
    inviteRequired: isInviteRequired(),
  })
}
