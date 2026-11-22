const within = (pathname: string, root: string) => pathname === root || pathname.startsWith(root + "/")

export function isPersonalArea(pathname: string) {
  return ["/me", "/settings", "/pulse"].some(root => within(pathname, root))
}

export function mainNavigation(pathname: string) {
  const community = pathname === "/" || ["/community", "/companies", "/company", "/search", "/submit"].some(root => within(pathname, root))
  return [
    { href: "/community", label: "社区", active: community },
    { href: "/me", label: "我的", active: isPersonalArea(pathname) },
  ]
}
