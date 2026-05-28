import { NextResponse } from "next/server"

export async function GET() {
  // TODO: When anonymous profile auth is in place (Phase 4+),
  // query companies by submittedByAnonymousProfileId.
  // For now, return an empty array since there is no user context.
  return NextResponse.json({ submissions: [] })
}
