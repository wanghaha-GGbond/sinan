import { expect, test } from "@playwright/test"

const id = "30000000-0000-4000-8000-000000000001"
test("runtime shutdown blocks API reads and writes before auth or DB despite an opt-in build", async ({ request }) => {
  for (const path of ["/api/dialogues", `/api/dialogues/${id}`, "/api/me/dialogues", "/api/moderation/dialogues", `/api/moderation/dialogues/${id}/applications`]) {
    const response = await request.get(path)
    expect(response.status()).toBe(404)
    expect(response.headers()["cache-control"]).toContain("no-store")
    expect(await response.json()).toEqual({ error: "Not found" })
  }
  for (const path of [`/api/dialogues/${id}/applications`, "/api/moderation/dialogues"]) {
    const response = await request.post(path, { data: {} })
    expect(response.status()).toBe(404)
  }
})
test("runtime shutdown blocks old page URLs with a real 404 without breaking community", async ({ request }) => {
  for (const path of ["/community/dialogues", `/community/dialogues/${id}`, "/me/dialogues", "/moderation/dialogues"]) {
    const response = await request.get(path)
    expect(response.status()).toBe(404)
    expect(await response.text()).not.toContain("你想问嘉宾什么？")
  }
  expect((await request.get("/community")).status()).toBe(200)
})
