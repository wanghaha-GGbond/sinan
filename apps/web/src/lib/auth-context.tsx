"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

// ── Types ──────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string
  displayName?: string
  role: string
  trustLevel?: number
}

type AuthState = {
  user: AuthUser | null
  loading: boolean
  sessionUnavailable: boolean
  loggingOut: boolean
  login: (params: LoginParams) => Promise<{ error?: string }>
  register: (params: RegisterParams) => Promise<{ error?: string }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  clearSession: () => void
}

export type LoginParams = {
  email?: string
  phone?: string
  password: string
}

export type RegisterParams = {
  email?: string
  phone?: string
  password: string
  inviteCode?: string
  verificationCode?: string
}

// ── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionUnavailable, setSessionUnavailable] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const sessionRevision = useRef(0)
  const logoutLock = useRef(false)
  const queryClient = useQueryClient()
  const router = useRouter()

  // Only call after a confirmed server-side sign-out or account deletion.
  const clearSession = useCallback(() => {
    ++sessionRevision.current
    void queryClient.cancelQueries()
    queryClient.clear()
    setUser(null)
    setSessionUnavailable(false)
    setLoading(false)
  }, [queryClient])

  const refresh = useCallback(async () => {
    const revision = ++sessionRevision.current
    setLoading(true)
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" })
      if (!res.ok) throw new Error("Session lookup failed")
      const data = await res.json()
      if (data?.user !== null && typeof data?.user?.id !== "string") throw new Error("Invalid session response")
      if (revision === sessionRevision.current) {
        setUser(data.user)
        setSessionUnavailable(false)
      }
    } catch {
      if (revision === sessionRevision.current) setSessionUnavailable(true)
    } finally {
      if (revision === sessionRevision.current) setLoading(false)
    }
  }, [])

  // Check auth on mount. This is the canonical "fetch once on mount" pattern
  // — React 19's set-state-in-effect rule flags it, but the alternative
  // (useSyncExternalStore) requires a global store and the cascading render
  // only happens once on first mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const login = useCallback(async (params: LoginParams) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
      const data = await res.json()
      if (!res.ok) {
        return { error: data.error ?? "登录失败" }
      }
      ++sessionRevision.current
      await queryClient.cancelQueries()
      queryClient.clear()
      setUser(data.user)
      setSessionUnavailable(false)
      return {}
    } catch {
      return { error: "网络错误，请稍后重试" }
    } finally {
      setLoading(false)
    }
  }, [queryClient])

  const register = useCallback(async (params: RegisterParams) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
      const data = await res.json()
      if (!res.ok) {
        return { error: data.error ?? "注册失败" }
      }
      ++sessionRevision.current
      await queryClient.cancelQueries()
      queryClient.clear()
      setUser(data.user)
      setSessionUnavailable(false)
      return {}
    } catch {
      return { error: "网络错误，请稍后重试" }
    } finally {
      setLoading(false)
    }
  }, [queryClient])

  const logout = useCallback(async () => {
    if (logoutLock.current) return
    logoutLock.current = true
    setLoggingOut(true)
    ++sessionRevision.current
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" })
      if (!response.ok || (await response.json()).success !== true) throw new Error("Logout not confirmed")
      clearSession()
      router.replace("/")
      router.refresh()
    } catch {
      // The httpOnly cookie may still be valid. Never show a false sign-out.
      toast.error("未能确认退出，请重试")
    } finally {
      logoutLock.current = false
      setLoggingOut(false)
      setLoading(false)
    }
  }, [router, clearSession])

  const value = useMemo<AuthState>(
    () => ({ user, loading, sessionUnavailable, loggingOut, login, register, logout, refresh, clearSession }),
    [user, loading, sessionUnavailable, loggingOut, login, register, logout, refresh, clearSession]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return ctx
}
