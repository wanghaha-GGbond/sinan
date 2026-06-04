import type { ApiResponse, ReviewListItem } from './types'

export async function getReviews(params: {
  companyId?: string;
  sort?: 'latest' | 'highest_score' | 'most_helpful';
  limit?: number;
  cursor?: string;
}): Promise<ApiResponse<{
  reviews: ReviewListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}>> {
  try {
    const qs = new URLSearchParams()
    if (params.companyId) qs.set('companyId', params.companyId)
    if (params.sort) qs.set('sort', params.sort)
    if (params.limit != null) qs.set('limit', String(params.limit))
    if (params.cursor) qs.set('cursor', params.cursor)
    const url = `/api/reviews?${qs.toString()}`
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) {
      return { data: null, loading: false, error: `HTTP ${res.status}` }
    }
    const json = await res.json()
    return { data: json, loading: false, error: null }
  } catch (e: unknown) {
    return { data: null, loading: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function submitReview(body: Record<string, unknown>): Promise<ApiResponse<{
  review: unknown;
  message: string;
}>> {
  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    })
    if (!res.ok) {
      return { data: null, loading: false, error: `HTTP ${res.status}` }
    }
    const json = await res.json()
    return { data: json, loading: false, error: null }
  } catch (e: unknown) {
    return { data: null, loading: false, error: e instanceof Error ? e.message : String(e) }
  }
}