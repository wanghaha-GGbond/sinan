const within = (pathname: string, root: string) => pathname === root || pathname.startsWith(root + "/")

export function isPersonalArea(pathname: string) {
  return ["/me", "/settings", "/pulse"].some(root => within(pathname, root))
}

export function mainNavigation(pathname: string) {
  const community = within(pathname, "/community") || /^\/company\/[^/]+\/community(?:\/|$)/.test(pathname)
  return [
    { href: "/community", label: "社区", active: community },
    { href: "/companies", label: "公司", active: !community && (pathname === "/" || ["/companies", "/company", "/search", "/submit"].some(root => within(pathname, root))) },
    { href: "/me", label: "我的", active: isPersonalArea(pathname) },
  ]
}
