"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"

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
  login: (params: LoginParams) => Promise<{ error?: string }>
  register: (params: RegisterParams) => Promise<{ error?: string }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
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
}

// ── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me")
      if (!res.ok) {
        setUser(null)
        return
      }
      const data = await res.json()
      setUser(data.user ?? null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
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
      setUser(data.user)
      return {}
    } catch {
      return { error: "网络错误，请稍后重试" }
    }
  }, [])

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
      setUser(data.user)
      return {}
    } catch {
      return { error: "网络错误，请稍后重试" }
    }
  }, [])

  const logout = useCallback(async () => {
    // Clear the httpOnly cookie via a simple endpoint or just clear state
    // The cookie is httpOnly so we can't delete it from JS.
    // We'll create a logout endpoint, but for now just clear local state
    // and redirect — the cookie will expire eventually.
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // If logout endpoint doesn't exist yet, just clear local state
    }
    setUser(null)
    router.push("/")
  }, [router])

  const value = useMemo<AuthState>(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh]
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
