import { appendFile } from "node:fs/promises"
import { randomBytes } from "node:crypto"
import { eq } from "drizzle-orm"
import { expect, test } from "../release-fixture"
import { db } from "../../src/db/client"
import { users } from "../../src/db/schema/users"
import { invites } from "../../src/db/schema/invites"
import { hashPassword } from "../../src/lib/server/auth"

test("opt-in owner mailbox receives a real registration challenge", async ({ request }) => {
  test.skip(process.env.STAGING_OWNER_MAIL_SMOKE_ENABLED !== "true", "Real mail is sent only during an explicitly enabled acceptance run")
  test.setTimeout(180_000)
  expect(process.env.NEXT_PUBLIC_APP_ENV).toBe("staging")
  expect(process.env.DATABASE_ADAPTER).toBe("neon")
  expect(process.env.NEON_PREVIEW_BRANCH).toMatch(/^sinan-pr-\d+$/)
  expect(process.env.STAGING_MAIL_TEST_ENABLED).toBe("true")
  const email = process.env.MAIL_TEST_RECIPIENT?.trim().toLowerCase()
  if (!email || !process.env.GITHUB_STEP_SUMMARY) throw new Error("Owner mailbox and GitHub summary are required for the mail acceptance run")
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  expect(existing, "The owner mailbox already has a staging account; use login instead of creating another account").toBeUndefined()
  const code = randomBytes(4).toString("hex").toUpperCase()
  const [issuer] = await db.insert(users).values({ displayName: "Staging invite issuer", passwordHash: await hashPassword(randomBytes(32).toString("hex")) }).returning({ id: users.id })
  let accepted = false
  try {
    await db.insert(invites).values({ code, inviterUserId: issuer.id })
    const response = await request.post("/api/auth/register-code", { data: { email, inviteCode: code } })
    expect(response.status(), "The registration endpoint must confirm provider acceptance, never a mail stub").toBe(202)
    expect(await response.json()).toMatchObject({ message: "验证码已发送" })
    const registrationURL = new URL("/register", process.env.RELEASE_BASE_URL)
    registrationURL.searchParams.set("invite", code)
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n### Owner registration mail acceptance\n- Provider accepted one real registration email. Inbox delivery still needs owner confirmation.\n- Complete registration: ${registrationURL.href}\n- This invitation exists only in the isolated Preview database and expires with its seven-day Neon branch.\n`)
    accepted = true
  } finally {
    // Retain a successful invitation for the owner's browser acceptance; it is
    // disposable test data in the PR branch, never in the production database.
    if (!accepted) {
      await db.delete(invites).where(eq(invites.code, code))
      await db.delete(users).where(eq(users.id, issuer.id))
    }
  }
})
