const within = (pathname: string, root: string) => pathname === root || pathname.startsWith(root + "/")

export function isPersonalArea(pathname: string) {
  return ["/me", "/settings", "/pulse", "/research"].some(root => within(pathname, root))
}

export function mainNavigation(pathname: string) {
  const community = within(pathname, "/community") || /^\/company\/[^/]+\/community(?:\/|$)/.test(pathname)
  return [
    { href: "/companies", label: "公司", active: !community && (pathname === "/" || ["/companies", "/company", "/search"].some(root => within(pathname, root))) },
    { href: "/community", label: "社区", active: community },
    { href: "/submit/review", label: "写评价", active: within(pathname, "/submit") },
    { href: "/me", label: "我的", active: isPersonalArea(pathname) },
  ]
}

export function personalNavigation(pathname: string, pulseEnabled: boolean) {
  return [
    { href: "/me", label: "概览", active: within(pathname, "/me") || within(pathname, "/settings") },
    ...(pulseEnabled ? [{ href: "/pulse", label: "打卡与周报", active: within(pathname, "/pulse") }] : []),
    { href: "/research", label: "公司研究", active: within(pathname, "/research") },
  ]
}
