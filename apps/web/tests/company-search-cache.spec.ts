import { expect, test } from "@playwright/test"
import { QueryClient, QueryObserver } from "@tanstack/react-query"

import { companySearchOptions, companySearchQueryKey } from "../src/lib/queries/company-search"
import type { CompanyListItem } from "../src/lib/types"

test("catalog consumers share one in-flight request and reuse fresh data", async () => {
  const originalFetch = globalThis.fetch
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    return Response.json({ companies: [{ id: "company-a", name: "Company A" }] })
  }
  try {
    const [home, directory, rankings] = await Promise.all([
      client.fetchQuery(companySearchOptions()),
      client.fetchQuery(companySearchOptions({ q: "" })),
      client.fetchQuery(companySearchOptions({ q: "  " })),
    ])
    const revisit = await client.fetchQuery(companySearchOptions())
    expect(calls).toBe(1)
    expect(home).toEqual(directory)
    expect(home).toEqual(rankings)
    expect(revisit).toEqual(home)
  } finally {
    globalThis.fetch = originalFetch
    client.clear()
  }
})

test("search caches stay separate and normalized keys match the request", async () => {
  const originalFetch = globalThis.fetch
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const urls: string[] = []
  globalThis.fetch = async (input) => {
    urls.push(String(input))
    return Response.json({ companies: [] })
  }
  try {
    await client.fetchQuery(companySearchOptions({ q: "  A  ", city: " Hangzhou " }))
    await client.fetchQuery(companySearchOptions({ q: "A", city: "Hangzhou" }))
    await client.fetchQuery(companySearchOptions({ q: "B", city: "Hangzhou" }))
    expect(urls).toEqual([
      "/api/companies/search?q=A&city=Hangzhou",
      "/api/companies/search?q=B&city=Hangzhou",
    ])
    expect(companySearchQueryKey({ industry: "tech" })).not.toEqual(companySearchQueryKey())
  } finally {
    globalThis.fetch = originalFetch
    client.clear()
  }
})

test("failed refresh retains cached results and does not cache a false empty success", async () => {
  const originalFetch = globalThis.fetch
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const companies = [{ id: "company-a", name: "Company A" }]
  client.setQueryData(companySearchQueryKey(), companies)
  globalThis.fetch = async () => new Response(null, { status: 503 })
  try {
    await expect(client.fetchQuery({ ...companySearchOptions(), staleTime: 0 })).rejects.toThrow("HTTP 503")
    expect(client.getQueryData(companySearchQueryKey())).toEqual(companies)
    await expect(client.fetchQuery(companySearchOptions({ q: "unseen" }))).rejects.toThrow("HTTP 503")
    expect(client.getQueryData(companySearchQueryKey({ q: "unseen" }))).toBeUndefined()
  } finally {
    globalThis.fetch = originalFetch
    client.clear()
  }
})

test("changing search terms keeps the previous result while the next request runs", async () => {
  const originalFetch = globalThis.fetch
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(companySearchQueryKey({ q: "A" }), [{ id: "a", name: "Company A" }])
  let finish!: (response: Response) => void
  globalThis.fetch = () => new Promise<Response>((resolve) => { finish = resolve })
  const observer = new QueryObserver<CompanyListItem[]>(client, companySearchOptions({ q: "A" }))
  const unsubscribe = observer.subscribe(() => {})
  try {
    observer.setOptions(companySearchOptions({ q: "B" }))
    expect(observer.getCurrentResult().isFetching).toBe(true)
    expect(observer.getCurrentResult().isPlaceholderData).toBe(true)
    expect(observer.getCurrentResult().data?.[0].id).toBe("a")
    finish(Response.json({ companies: [{ id: "b", name: "Company B" }] }))
    await expect.poll(() => observer.getCurrentResult().data?.[0].id).toBe("b")
    expect(observer.getCurrentResult().isPlaceholderData).toBe(false)
  } finally {
    unsubscribe()
    globalThis.fetch = originalFetch
    client.clear()
  }
})
