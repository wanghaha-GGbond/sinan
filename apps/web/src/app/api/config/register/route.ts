import { NextResponse } from "next/server"

import { isInviteRequired } from "@/lib/server/invites"
import { isMailConfigured } from "@/lib/server/mail"

export async function GET() {
  return NextResponse.json({
    inviteRequired: isInviteRequired(),
    emailVerificationRequired: true,
    emailDeliveryAvailable: isMailConfigured(),
  }, { headers: { "Cache-Control": "no-store" } })
}
