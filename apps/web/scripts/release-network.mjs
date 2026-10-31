// A synthetic trusted-proxy header is valid only for the loopback test server.
// Public Cloudflare rejects it; real deployments must supply their own client IP.
export function releaseTestProxyHeaders(clientId, baseUrl) {
  if (baseUrl) {
    const url = new URL(baseUrl)
    if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) return {}
  }
  if (!/^[a-f0-9]{8,}$/i.test(clientId)) throw new Error("Expected a random hex test ID")
  return { "cf-connecting-ip": `2001:db8:${clientId.slice(0, 4)}:${clientId.slice(4, 8)}::1` }
}
