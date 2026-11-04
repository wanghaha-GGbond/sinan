import { randomUUID } from "node:crypto"
import { eq, inArray } from "drizzle-orm"
import { NextRequest } from "next/server"
import { expect, test } from "../database-fixture"
import { db } from "../../src/db/client"
import { users } from "../../src/db/schema/users"
import { signToken } from "../../src/lib/server/auth"
import { GET, POST, DELETE } from "../../src/app/api/me/pulse/route"
import { GET as companyPulse } from "../../src/app/api/companies/[id]/pulse/route"
import { companies } from "../../src/db/schema/companies"
import { companyVerifications } from "../../src/db/schema/company-verifications"
import { pulseCheckins } from "../../src/db/schema/pulse-checkins"
import { pulseDay, shiftPulseDay } from "../../src/lib/pulse"

const ids: string[] = []
const companyIds: string[] = []
const originalFlag = process.env.NEXT_PUBLIC_PULSE_ENABLED
test.beforeEach(() => { process.env.NEXT_PUBLIC_PULSE_ENABLED = "true" })
test.afterEach(async () => {
  if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_PULSE_ENABLED
  else process.env.NEXT_PUBLIC_PULSE_ENABLED = originalFlag
  if (ids.length) {
    await db.delete(companyVerifications).where(inArray(companyVerifications.applicantUserId, ids))
    await db.delete(users).where(inArray(users.id, ids.splice(0)))
  }
  if (companyIds.length) await db.delete(companies).where(inArray(companies.id, companyIds.splice(0)))
})

async function company() {
  const [row] = await db.insert(companies).values({ name: "Pulse test " + randomUUID(), city: "上海", industry: "软件", reviewStatus: "reviewable" }).returning()
  companyIds.push(row.id)
  return row.id
}
async function approve(userId: string, companyId: string) {
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId))
  await db.insert(companyVerifications).values({ companyId, companyName: "Pulse fixture", applicantUserId: userId, applicantName: "隔离测试", workEmail: "fixture@integration.sinan.test", jobTitle: "测试", proofType: "business_document", status: "approved", reviewedAt: new Date(Date.now() - 30 * 86400_000) })
}
test("only explicit consent plus valid verification links a check-in to a company", async () => {
  const token = await account(), userId = ids.at(-1)!, companyId = await company()
  const payload = { energy: 8, pressure: 3, companyId, shareWithCompany: true }
  expect((await POST(request(token,payload))).status).toBe(403)
  await approve(userId,companyId)
  expect((await POST(request(token,payload))).status).toBe(200)
  let report = await (await GET(request(token))).json()
  expect(report.records[0].companyId).toBe(companyId)
  expect(report.eligibleCompanies).toContainEqual({ id: companyId, name: expect.any(String) })
  expect((await POST(request(token,{ ...payload, shareWithCompany: false }))).status).toBe(200)
  report = await (await GET(request(token))).json()
  expect(report.records[0].companyId).toBeNull()
  const other = await account()
  await POST(request(other,{ energy: 2, pressure: 4 }))
  expect((await DELETE(new NextRequest("https://app.example/api/me/pulse",{method:"DELETE",headers:{authorization:"Bearer " + token,"content-type":"application/json"},body:JSON.stringify({confirmation:"DELETE_MY_PULSE"})}))).status).toBe(200)
  expect((await (await GET(request(token))).json()).records).toEqual([])
  expect((await (await GET(request(other))).json()).records).toHaveLength(1)
})

test("company trend requires 30 distinct verified accounts per closed day and exposes no private data", async () => {
  test.setTimeout(120_000)
  const companyId = await company(), today = pulseDay(), yesterday = shiftPulseDay(today,-1)
  const cohort = await db.insert(users).values(Array.from({length:30},()=>({email:"pulse-cohort-"+randomUUID()+"@integration.sinan.test",emailVerifiedAt:new Date()}))).returning({id:users.id})
  ids.push(...cohort.map(row=>row.id))
  await db.insert(companyVerifications).values(cohort.map(row=>({companyId,companyName:"Pulse fixture",applicantUserId:row.id,applicantName:"PRIVATE_NAME",workEmail:"PRIVATE_EMAIL@integration.sinan.test",jobTitle:"PRIVATE_JOB",proofType:"business_document" as const,status:"approved" as const,reviewedAt:new Date(Date.now()-30*86400_000)})))
  await db.insert(pulseCheckins).values(cohort.slice(0,29).map(row=>({userId:row.id,companyId,day:yesterday,energy:9,pressure:3,workMinutes:600,endMinute:1200})))
  const read = (query="") => companyPulse(new NextRequest("https://app.example/api/companies/"+companyId+"/pulse"+query),{params:Promise.resolve({id:companyId})})
  expect((await (await read()).json()).points).toEqual([])
  // The same participants repeated over several days do not count as new people.
  await db.insert(pulseCheckins).values(cohort.slice(0,29).map(row=>({userId:row.id,companyId,day:shiftPulseDay(today,-2),energy:9,pressure:3})))
  expect((await (await read()).json()).points).toEqual([])
  await db.insert(pulseCheckins).values({userId:cohort[29].id,companyId,day:yesterday,energy:9,pressure:3})
  await db.insert(pulseCheckins).values(cohort.map(row=>({userId:row.id,companyId,day:today,energy:1,pressure:10})))
  const response = await read(), body = await response.json()
  expect(response.headers.get("cache-control")).toBe("no-store")
  expect(body.points).toEqual([{day:yesterday,score:85,participants:"30–49"}])
  for(const forbidden of ["PRIVATE_NAME","PRIVATE_EMAIL","PRIVATE_JOB","userId","workMinutes","endMinute",...cohort.map(row=>row.id)]) expect(JSON.stringify(body)).not.toContain(forbidden)
  expect((await read("?department=small-team")).status).toBe(400)
  await db.update(companyVerifications).set({status:"revoked"}).where(eq(companyVerifications.applicantUserId,cohort[29].id))
  expect((await (await read()).json()).points).toEqual([])
  await db.update(companyVerifications).set({status:"approved"}).where(eq(companyVerifications.applicantUserId,cohort[29].id))
  await db.update(users).set({deletedAt:new Date(),status:"deleted"}).where(eq(users.id,cohort[29].id))
  expect((await (await read()).json()).points).toEqual([])
  await db.update(companies).set({reviewStatus:"pending_review"}).where(eq(companies.id,companyId))
  expect((await read()).status).toBe(404)
})
async function account() {
  const [user] = await db.insert(users).values({ email: `pulse-${randomUUID()}@integration.sinan.test` }).returning()
  ids.push(user.id)
  return signToken({ userId: user.id, role: "user" })
}
function request(token: string, body?: unknown) {
  return new NextRequest("https://app.example/api/me/pulse", {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}
test("daily upsert is unique, private, and read after a new request", async () => {
  const a = await account(), b = await account()
  const results = await Promise.all([1, 4, 7].map(energy => POST(request(a, { energy, pressure: 3 }))))
  expect(results.map(r => r.status)).toEqual([200, 200, 200])
  const response = await GET(request(a))
  expect(response.headers.get("cache-control")).toBe("private, no-store")
  const body = await response.json()
  expect(body.records).toHaveLength(1)
  expect(body.records[0]).not.toHaveProperty("userId")
  expect((await (await GET(request(b))).json()).records).toEqual([])
  expect((await POST(request(a, { energy: 2, pressure: 2, userId: ids[1] }))).status).toBe(400)
  expect((await POST(request(a, { energy: 2, pressure: 2, day: "2000-01-01" }))).status).toBe(400)
})
test("disabled and unauthenticated endpoints fail closed", async () => {
  expect((await GET(request("invalid-token"))).status).toBe(401)
  expect((await POST(request("invalid-token", { energy: 2, pressure: 2 }))).status).toBe(401)
  process.env.NEXT_PUBLIC_PULSE_ENABLED = "false"
  expect((await GET(request("invalid-token"))).status).toBe(404)
  expect((await POST(request("invalid-token", { energy: 2, pressure: 2 }))).status).toBe(404)
})
