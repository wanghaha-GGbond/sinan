import * as SecureStore from "expo-secure-store"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Platform } from "react-native"

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "")
const TOKEN_KEY = "sinan.auth.token"

export type SessionUser = {
  id: string
  displayName?: string | null
  role: string
  trustLevel?: number
}

export type CompanyListItem = {
  id: string
  name: string
  shortName: string | null
  city: string
  industry: string
  size: string | null
  financingStage: string | null
  description: string | null
  directionScore?: number
  recommendationRate?: number
  reviewCount?: number
  riskTags?: string[]
}

export type ReviewListItem = {
  id: string
  companyId: string
  title: string
  content: string | null
  directionScore: string
  authorLabel: string
  authorRole: string
  usefulCount: number
  isUsefulByCurrentUser?: boolean
  discussionCount: number
  publicAuthor?: {
    label: string
    role: string
    verificationLevel: "none" | "L1" | "L2"
    verifiedForCompany: boolean
  }
  createdAt: string
}

export type ResearchListItem = {
  slug: string
  name: string
  city: string
  industry: string
  overallScore: number
  confidence: number
  funTag: string
  oneLine: string
}

export type ResearchReport = {
  card: {
    name: string
    city: string
    industry: string
    recommendationTier: string
    oneLine: string
    departments: string[]
    candidateAdvice: string
    opportunityDetails: Array<{ signal: string; basis: string; sourceUrl: string }>
    riskDetails: Array<{ signal: string; basis: string; sourceUrl: string }>
  }
  index: {
    overallScore: number
    confidence: number
    funTag: string
    components: Record<string, { score: number; confidence: number; evidenceCount: number; limitations: string[] }>
    funIndices: Record<string, { score: number }>
  }
  labels: { components: Record<string, string>; funIndices: Record<string, string> }
}

async function getToken() {
  return Platform.OS === "web"
    ? AsyncStorage.getItem(TOKEN_KEY)
    : SecureStore.getItemAsync(TOKEN_KEY)
}

async function setToken(token: string) {
  if (Platform.OS === "web") await AsyncStorage.setItem(TOKEN_KEY, token)
  else await SecureStore.setItemAsync(TOKEN_KEY, token)
}

async function deleteToken() {
  if (Platform.OS === "web") await AsyncStorage.removeItem(TOKEN_KEY)
  else await SecureStore.deleteItemAsync(TOKEN_KEY)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken()
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Sinan-Client": "ios",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error ?? `请求失败 (${response.status})`)
  return data as T
}

async function persistSession(result: { user: SessionUser; token?: string }) {
  if (!result.token) throw new Error("服务端未返回 iOS 会话")
  await setToken(result.token)
  return result.user
}

export async function login(input: { email?: string; phone?: string; password: string }) {
  return persistSession(await request<{ user: SessionUser; token?: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  }))
}

export async function register(input: { email?: string; phone?: string; password: string; inviteCode: string }) {
  return persistSession(await request<{ user: SessionUser; token?: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  }))
}

export async function getSession() {
  const result = await request<{ user: SessionUser | null }>("/api/auth/me")
  return result.user
}

export async function logout() {
  await deleteToken()
}

export function getWebUrl(path: string) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`
}

export async function deleteAccount() {
  await request<{ success: true }>("/api/me/account", {
    method: "DELETE",
    body: JSON.stringify({ confirmation: "DELETE" }),
  })
  await deleteToken()
}

export async function searchCompanies(query = "") {
  const params = new URLSearchParams()
  if (query.trim()) params.set("q", query.trim())
  const result = await request<{ companies: CompanyListItem[] }>(`/api/companies/search?${params}`)
  return result.companies
}

export async function getCompany(companyId: string) {
  const result = await request<{ company: CompanyListItem }>(`/api/companies/${companyId}`)
  return result.company
}

export async function getCompanyReviews(companyId: string) {
  const result = await request<{ reviews: ReviewListItem[] }>(`/api/companies/${companyId}/reviews`)
  return result.reviews
}

export async function getReview(reviewId: string) {
  const result = await request<{ review: ReviewListItem }>(
    `/api/reviews/${encodeURIComponent(reviewId)}`
  )
  return result.review
}

export async function setReviewUseful(reviewId: string, useful: boolean) {
  return request<{
    usefulCount: number
    isUsefulByCurrentUser: boolean
  }>(`/api/reviews/${encodeURIComponent(reviewId)}/useful`, {
    method: "POST",
    body: JSON.stringify({ useful }),
  })
}

export async function getResearchReports() {
  return request<{
    generatedAt: string
    summary: { companies: number; observations: number; usableObservations: number; externalEvidence: number }
    companies: ResearchListItem[]
  }>("/api/research")
}

export async function getResearchReport(slug: string) {
  return request<ResearchReport>(`/api/research/${encodeURIComponent(slug)}`)
}

export async function submitReview(input: {
  companyId: string
  authorRole: string
  title: string
  content: string
  directionScore: number
  jobTitle: string
  ratingDimensions: {
    pay_worth: number
    growth: number
    leader: number
    overtime_truth: number
    promise_delivery: number
  }
}) {
  return request<{ review: ReviewListItem; message: string }>("/api/reviews", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
