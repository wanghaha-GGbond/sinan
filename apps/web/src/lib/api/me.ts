import type { ApiResponse } from './types'

export async function getMeDashboard(): Promise<ApiResponse<{
  user: {
    id: string;
    displayName: string;
    role: string;
    trustLevel: number;
    reputationScore: number;
    jobBand: string | null;
    yearsOfExperience: number | null;
    highlightMoment: string | null;
    declinedOffer: string | null;
    companyName: string | null;
    inviterName: string | null;
    usefulCount?: number;
  } | null;
  stats: { directionPoints: number; nextLevelPoints: number; streakDays: number; helpedCount: number };
  dailyTasks: Array<{ id: string; title: string; rewardPoints: number; progress: number; target: number; completed: boolean; href?: string; hint?: string }>;
  badges: Array<{ id: string; name: string; description: string; unlocked: boolean; progress?: number; target?: number }>;
  myReviews: Array<{ id: string; companyId: string; companyName: string; title: string; score: number; shortComment: string; helpful: number; commentCount: number; createdAt: string }>;
  favoriteCompanies: Array<{ companyId: string; companyName: string; createdAt: string }>;
  verifications: Array<{ id: string; companyName: string; proofType: string; status: string; createdAt: string }>;
  invites: { total: number; used: number; unused: Array<{ id: string; code: string; status: string; createdAt: string }> };
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
