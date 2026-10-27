import { randomUUID } from "node:crypto"
import { eq, inArray, sql } from "drizzle-orm"
import { expect, test } from "../database-fixture"
import { db } from "../../src/db/client"
import { registrationCodes } from "../../src/db/schema/registration-codes"
import { registrationEmailHash } from "../../src/lib/server/registration-code-policy"
import { consumeRegistrationCode, issueRegistrationCode } from "../../src/lib/server/registration-codes"

const emails: string[] = []
const oldSecret = process.env.AUTH_SECRET
test.beforeAll(() => { process.env.AUTH_SECRET = "registration-integration-only-secret-12345678901234567890" })
test.afterAll(() => { if (oldSecret === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = oldSecret })
test.afterEach(async () => {
  if (emails.length) await db.delete(registrationCodes).where(inArray(registrationCodes.emailHash, emails.splice(0).map(registrationEmailHash)))
})

async function fixture() {
  const email = `registration-${randomUUID()}@integration.sinan.test`
  emails.push(email)
  let code = ""
  await issueRegistrationCode(email, async (message) => { code = message.text.match(/\d{6}/)![0] })
  return { email, code, emailHash: registrationEmailHash(email) }
}

test("only a delivered hash is stored and code consumption is single-use under concurrency", async () => {
  const { email, code, emailHash } = await fixture()
  const [stored] = await db.select().from(registrationCodes).where(eq(registrationCodes.emailHash, emailHash))
  expect(stored.codeHash).not.toBe(code)
  expect(stored.deliveredAt).not.toBeNull()
  expect(JSON.stringify(stored)).not.toContain(email)
  const results = await Promise.all([0, 1].map(() => db.transaction((tx) => consumeRegistrationCode(tx, email, code))))
  expect(results.filter(Boolean)).toHaveLength(1)
  expect(await db.transaction((tx) => consumeRegistrationCode(tx, email, code))).toBe(false)
})

test("wrong attempts persist and lock the challenge after five failures", async () => {
  const { email, code, emailHash } = await fixture()
  const wrong = String((Number(code) + 1) % 1_000_000).padStart(6, "0")
  for (let attempt = 0; attempt < 5; attempt++) expect(await db.transaction((tx) => consumeRegistrationCode(tx, email, wrong))).toBe(false)
  const [stored] = await db.select().from(registrationCodes).where(eq(registrationCodes.emailHash, emailHash))
  expect(stored.attempts).toBe(5)
  expect(await db.transaction((tx) => consumeRegistrationCode(tx, email, code))).toBe(false)
})

test("expired and not-yet-delivered challenges cannot create accounts", async () => {
  const { email, code, emailHash } = await fixture()
  await db.update(registrationCodes).set({ deliveredAt: null }).where(eq(registrationCodes.emailHash, emailHash))
  expect(await db.transaction((tx) => consumeRegistrationCode(tx, email, code))).toBe(false)
  await db.update(registrationCodes).set({ deliveredAt: new Date(), expiresAt: sql`clock_timestamp() - interval '1 second'` })
    .where(eq(registrationCodes.emailHash, emailHash))
  expect(await db.transaction((tx) => consumeRegistrationCode(tx, email, code))).toBe(false)
})

test("a failed account transaction preserves the code for a legitimate retry", async () => {
  const { email, code } = await fixture()
  await expect(db.transaction(async (tx) => {
    expect(await consumeRegistrationCode(tx, email, code)).toBe(true)
    throw new Error("account creation failed")
  })).rejects.toThrow("account creation failed")
  expect(await db.transaction((tx) => consumeRegistrationCode(tx, email, code))).toBe(true)
})

test("resending replaces the challenge and failed delivery removes it", async () => {
  const { email, emailHash } = await fixture()
  const [before] = await db.select().from(registrationCodes).where(eq(registrationCodes.emailHash, emailHash))
  let replacement = ""
  await issueRegistrationCode(email, async (message) => { replacement = message.text.match(/\d{6}/)![0] })
  const [after] = await db.select().from(registrationCodes).where(eq(registrationCodes.emailHash, emailHash))
  expect(after.id).not.toBe(before.id)
  expect(after.codeHash).not.toBe(before.codeHash)
  expect(await db.transaction((tx) => consumeRegistrationCode(tx, email, replacement))).toBe(true)
  await expect(issueRegistrationCode(email, async () => { throw new Error("provider unavailable") })).rejects.toThrow("delivery failed")
  expect(await db.select().from(registrationCodes).where(eq(registrationCodes.emailHash, emailHash))).toHaveLength(0)
})
