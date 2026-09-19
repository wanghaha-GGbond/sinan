import * as SecureStore from "expo-secure-store"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Platform } from "react-native"
import {
  isAuthApiResponse,
  isCompanyDetailApiResponse,
  isCompanySearchApiResponse,
  isDeleteAccountApiResponse,
  isResearchDetailApiResponse,
  isResearchListApiResponse,
  isReviewDetailApiResponse,
  isReviewListApiResponse,
  isReviewMutationApiResponse,
  isReviewUsefulApiResponse,
  type ApiUser,
  type AuthApiResponse,
  type CompanyApiItem,
  type ResearchListItem as SharedResearchListItem,
  type ResearchReport as SharedResearchReport,
  type ReviewApiItem,
} from "@sinan/shared"

export type SessionUser = ApiUser
export type CompanyListItem = CompanyApiItem
export type ReviewListItem = ReviewApiItem
export type ResearchListItem = SharedResearchListItem
export type ResearchReport = SharedResearchReport

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  (process.env.NODE_ENV === "production" ? "https://sinanapp.cn" : "http://localhost:3000")
).replace(/\/$/, "")
const TOKEN_KEY = "sinan.auth.token"
const FINGERPRINT_KEY = "sinan.reporter.fingerprint"

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
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

async function getFingerprint() {
  const existing = Platform.OS === "web"
    ? await AsyncStorage.getItem(FINGERPRINT_KEY)
    : await SecureStore.getItemAsync(FINGERPRINT_KEY)
  if (existing) return existing
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    // This is only a deduplication hint, never an authentication factor. The
    // server still applies IP limits and stores only a keyed digest.
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }
  const fingerprint = `ios-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`
  if (Platform.OS === "web") await AsyncStorage.setItem(FINGERPRINT_KEY, fingerprint)
  else await SecureStore.setItemAsync(FINGERPRINT_KEY, fingerprint)
  return fingerprint
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  validate?: (value: unknown) => value is T,
): Promise<T> {
  const token = await getToken()
  const fingerprint = path.includes("/reports") ? await getFingerprint() : null
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Sinan-Client": "ios",
      ...(fingerprint ? { "X-Sinan-Fingerprint": fingerprint } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(data.error ?? `请求失败 (${response.status})`, response.status)
  if (validate && !validate(data)) throw new ApiError("服务响应格式错误", 502)
  return data as T
}

async function persistSession(result: AuthApiResponse) {
  if (!result.user || !result.token) throw new ApiError("服务端未返回有效 iOS 会话", 502)
  await setToken(result.token)
  return result.user
}

export async function login(input: { email?: string; phone?: string; password: string }) {
  return persistSession(await request<AuthApiResponse>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify(input) },
    isAuthApiResponse,
  ))
}

export async function register(input: { email?: string; phone?: string; password: string; inviteCode: string }) {
  return persistSession(await request<AuthApiResponse>(
    "/api/auth/register",
    { method: "POST", body: JSON.stringify(input) },
    isAuthApiResponse,
  ))
}

export async function getSession() {
  const result = await request<AuthApiResponse>("/api/auth/me", {}, isAuthApiResponse)
  return result.user
}

export async function logout() {
  await deleteToken()
}

export function getWebUrl(path: string) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`
}

export async function deleteAccount() {
  await request(
    "/api/me/account",
    { method: "DELETE", body: JSON.stringify({ confirmation: "DELETE" }) },
    isDeleteAccountApiResponse,
  )
  await deleteToken()
}

export async function searchCompanies(query = "") {
  const params = new URLSearchParams()
  if (query.trim()) params.set("q", query.trim())
  const result = await request(`/api/companies/search?${params}`, {}, isCompanySearchApiResponse)
  return result.companies
}

export async function getCompany(companyId: string) {
  const result = await request(`/api/companies/${companyId}`, {}, isCompanyDetailApiResponse)
  return result.company
}

export async function getCompanyReviews(companyId: string) {
  const result = await request(`/api/companies/${companyId}/reviews`, {}, isReviewListApiResponse)
  return result.reviews
}

export async function getReview(reviewId: string) {
  const result = await request(
    `/api/reviews/${encodeURIComponent(reviewId)}`,
    {},
    isReviewDetailApiResponse,
  )
  return result.review
}

export async function setReviewUseful(reviewId: string, useful: boolean) {
  return request(
    `/api/reviews/${encodeURIComponent(reviewId)}/useful`,
    { method: "POST", body: JSON.stringify({ useful }) },
    isReviewUsefulApiResponse,
  )
}

export async function submitReviewReport(input: {
  reviewId: string
  reason: string
  note?: string
}) {
  return request<{
    id: string
    status: string
    reason: string
    createdAt: string
    alreadyReported?: boolean
  }>(`/api/reviews/${encodeURIComponent(input.reviewId)}/reports`, {
    method: "POST",
    body: JSON.stringify({ reason: input.reason, note: input.note }),
  })
}

export async function blockReviewAuthor(reviewId: string) {
  return request<{ blocked: true; created: boolean; blockId: string | null }>(
    `/api/reviews/${encodeURIComponent(reviewId)}/block-author`,
    { method: "POST" },
  )
}

export async function unblockReviewAuthor(reviewId: string) {
  return request<{ blocked: false; removed: boolean }>(
    `/api/reviews/${encodeURIComponent(reviewId)}/block-author`,
    { method: "DELETE" },
  )
}

export async function getResearchReports() {
  return request("/api/research", {}, isResearchListApiResponse)
}

export async function getResearchReport(slug: string) {
  return request(`/api/research/${encodeURIComponent(slug)}`, {}, isResearchDetailApiResponse)
}

export async function submitReview(input: {
  companyId: string
  authorRole: string
  title: string
  content: string
  directionScore: number
  jobTitle: string
  city?: string
  employmentStatus?: string
  recommendToJoin?: boolean
  questionnaire?: Record<string, unknown>
  ratingDimensions: {
    pay_worth: number
    growth: number
    leader: number
    overtime_truth: number
    promise_delivery: number
  }
}) {
  return request(
    "/api/reviews",
    { method: "POST", body: JSON.stringify(input) },
    isReviewMutationApiResponse,
  )
}
