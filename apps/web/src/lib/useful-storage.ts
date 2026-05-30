"use client"

const STORAGE_KEY = "sinan_useful_reviews"

function readIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []
  } catch {
    return []
  }
}

function writeIds(ids: string[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

export function isReviewUseful(reviewId: string) {
  return readIds().includes(reviewId)
}

export function toggleReviewUseful(reviewId: string) {
  const ids = readIds()
  if (ids.includes(reviewId)) {
    const next = ids.filter((id) => id !== reviewId)
    writeIds(next)
    return false
  }
  writeIds([...ids, reviewId])
  return true
}
