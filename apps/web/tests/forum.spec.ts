import { expect, test } from "@playwright/test"
import { NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

test("original SVG assets stay same-origin, vector-only and script-free", () => {
  for (const name of ["conversation", "review", "company", "reply", "agree", "quiet"]) {
    const svg = readFileSync(resolve(process.cwd(), `public/brand/${name}.svg`), "utf8")
    expect(svg).toContain('id="art"')
    expect(svg).toContain("currentColor")
    expect(svg).not.toMatch(/<script|foreignObject|<image|\bon\w+=|href=|https?:\/\/(?!www\.w3\.org\/2000\/svg)/i)
  }
})
import { forumCursor, parseForumCursor, forumFiltersSchema, forumPostInput, forumSearchPattern } from "../src/lib/forum"
test("search is bounded and literal, and cursors cannot cross search scopes", () => {
  expect(forumFiltersSchema.parse({ q: "  面试  " }).q).toBe("面试")
  expect(forumFiltersSchema.safeParse({ q: "x".repeat(81) }).success).toBe(false)
  expect(forumSearchPattern("50%_\\")).toBe("%50\\%\\_\\\\%")
  const filters = forumFiltersSchema.parse({ q: "面试" })
  const cursor = forumCursor(filters, { id: randomUUID(), createdAt: new Date(), usefulCount: 0 })
  expect(() => parseForumCursor({ ...filters, q: "工作", cursor })).toThrow()
})
import { forumRoute, readForumJson, forumOriginAllowed } from "../src/lib/server/forum-http"
import { GET, POST } from "../src/app/api/forum/posts/route"
import { PUT as vote } from "../src/app/api/forum/posts/[postId]/useful/route"
test("forum cursors bind company, category, scope and sort and reject malformed payloads", () => {
  const filters = forumFiltersSchema.parse({ companyId: randomUUID() })
  const row = { id: randomUUID(), createdAt: new Date("2026-11-07T00:00:00Z"), usefulCount: 0 }, cursor = forumCursor(filters, row)
  expect(parseForumCursor({ ...filters, cursor })?.id).toBe(row.id)
  for (const change of [{ sort: "useful" as const }, { feed: "mine" as const }, { category: "career" as const }, { companyId: randomUUID() }]) expect(() => parseForumCursor({ ...filters, ...change, cursor })).toThrow()
  for (const bad of ["!", "a".repeat(300), Buffer.from('{"id":"bad"}').toString("base64url")]) expect(() => parseForumCursor({ ...filters, cursor: bad })).toThrow()
})
test("forum submission rejects caller identity and status, validates lengths", () => {
  const data = { requestId: randomUUID(), companyId: randomUUID(), category: "question", title: "测试标题", content: "这是十个字以上的正常讨论内容。" }
  expect(forumPostInput.safeParse(data).success).toBe(true)
  for (const extra of [{ status: "visible" }, { authorUserId: randomUUID() }, { title: "x" }, { content: "x" }]) expect(forumPostInput.safeParse({ ...data, ...extra }).success).toBe(false)
})
test("forum fails closed and unauthenticated or cross-origin writes never reach data", async () => {
  const previous = process.env.DATABASE_URL; delete process.env.DATABASE_URL
  try {
    expect((await GET(new NextRequest("https://app.test/api/forum/posts?feed=unknown"))).status).toBe(400)
    const response = await GET(new NextRequest("https://app.test/api/forum/posts", { headers: { Authorization: "Bearer invalid" } }))
    expect(response.status).toBe(503); expect(response.headers.get("cache-control")).toContain("no-store")
    expect((await POST(new NextRequest("https://app.test/api/forum/posts", { method: "POST", headers: { Authorization: "Bearer invalid" }, body: "{}" }))).status).toBe(401)
    expect((await POST(new NextRequest("https://app.test/api/forum/posts", { method: "POST", headers: { Origin: "https://other.test" }, body: "{}" }))).status).toBe(403)
    expect((await vote(new NextRequest("https://app.test/api/forum/posts/id/useful", { method: "PUT", headers: { Authorization: "Bearer invalid" }, body: '{"useful":true}' }), { params: Promise.resolve({ postId: randomUUID() }) })).status).toBe(401)
  } finally { if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous }
})
test("forum reader enforces byte limits without trusting content-length", async () => {
  const response = await forumRoute(async () => { await readForumJson(new Request("https://app.test", { method: "POST", body: JSON.stringify({ content: "测".repeat(6000) }) }), forumPostInput); return Response.json({}) })
  expect(response.status).toBe(413)
})
test("forum origin gate handles reverse-proxy internal URLs without trusting a different host", () => {
  expect(forumOriginAllowed("http://127.0.0.1:3000", "http://localhost:3000/api/forum/posts", "127.0.0.1:3000")).toBe(true)
  expect(forumOriginAllowed("https://preview.vercel.app", "http://localhost:3000/api/forum/posts", "preview.vercel.app")).toBe(true)
  for (const origin of ["https://evil.test", "null", "https://preview.vercel.app/path", "http://preview.vercel.app"]) expect(forumOriginAllowed(origin, "http://localhost:3000/api/forum/posts", "preview.vercel.app")).toBe(false)
})
