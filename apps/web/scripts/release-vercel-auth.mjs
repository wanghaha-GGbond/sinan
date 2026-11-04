const protectionHeader = "x-vercel-trusted-oidc-idp-token"

function protectedOrigin(env) {
  if (!env.RELEASE_VERCEL_OIDC_TOKEN) return null
  const url = new URL(env.RELEASE_BASE_URL)
  if (url.protocol !== "https:" || !url.hostname.endsWith(".vercel.app") || url.username || url.password) {
    throw new Error("Release protection credentials require an HTTPS Vercel Preview URL")
  }
  return url.origin
}

export function releaseProtectionHeaders(url, headers, env) {
  const origin = protectedOrigin(env)
  const scoped = Object.fromEntries(Object.entries(headers || {}).filter(([name]) => name.toLowerCase() !== protectionHeader))
  if (origin && new URL(url).origin === origin) scoped[protectionHeader] = env.RELEASE_VERCEL_OIDC_TOKEN
  return scoped
}

export function releaseRequestOptions(url, options, env) {
  const origin = protectedOrigin(env)
  if (!origin) return options
  if (typeof url !== "string" || new URL(url, origin).origin !== origin) {
    throw new Error("Release API requests must stay on the verified Preview origin")
  }
  return { ...options, headers: releaseProtectionHeaders(new URL(url, origin).href, options?.headers, env), maxRedirects: 0 }
}

export function redactReleaseCredential(text, env) {
  return env.RELEASE_VERCEL_OIDC_TOKEN ? String(text).split(env.RELEASE_VERCEL_OIDC_TOKEN).join("[redacted]") : String(text)
}
