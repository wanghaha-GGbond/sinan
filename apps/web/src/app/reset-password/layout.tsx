import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "设置新密码 | 在场",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
}

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
