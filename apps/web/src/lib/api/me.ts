import type { ApiResponse } from './types'

export async function getMeDashboard(): Promise<ApiResponse<{
  user: { id: string; displayName: string; role: string; trustLevel: number } | null;
  stats: { directionPoints: number; nextLevelPoints: number; streakDays: number; helpedCount: number };
  dailyTasks: unknown[];
  badges: unknown[];
  myReviews: unknown[];
  favoriteCompanies: unknown[];
}>> {
  try {
    const res = await fetch('/api/me', { credentials: 'include' })
    if (!res.ok) {
      return { data: null, loading: false, error: `HTTP ${res.status}` }
    }
    const json = await res.json()
    return { data: json, loading: false, error: null }
  } catch (e: unknown) {
    return { data: null, loading: false, error: e instanceof Error ? e.message : String(e) }
  }
}