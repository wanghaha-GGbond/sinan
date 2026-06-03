"use client"

/**
 * Persisted set of favorited company ids for the current (mock) user.
 * Stored in localStorage. SSR-safe.
 */

const STORAGE_KEY = "sinan_favorite_companies"

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

/** Whether the current user has favorited this company. */
export function isCompanyFavorited(companyId: string): boolean {
  return readIds().includes(companyId)
}

/** Toggle favorite state for a company. Returns the new state. */
export function toggleCompanyFavorite(companyId: string): boolean {
  const ids = readIds()
  if (ids.includes(companyId)) {
    writeIds(ids.filter((id) => id !== companyId))
    return false
  }
  writeIds([...ids, companyId])
  return true
}

/** Read the full set of favorited company ids (used by /me). */
export function getFavoritedCompanyIds(): string[] {
  return readIds()
}
