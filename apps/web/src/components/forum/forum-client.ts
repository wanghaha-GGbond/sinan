"use client"
export async function forumFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "include", cache: "no-store", ...options })
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.error ?? "操作失败，请重试")
  if (!result || typeof result !== "object") throw new Error("未能确认操作结果，请重试")
  return result as T
}
export const forumBody = (method: string, body: unknown) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
