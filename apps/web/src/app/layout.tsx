import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/app-shell";
import { KeyboardShortcuts } from "@/components/layout/keyboard-shortcuts";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "在场 | 入职前，先看清方向",
  description: "匿名公司方向评分、真实评价、薪资区间与企业认证平台。",
  applicationName: "在场",
  appleWebApp: {
    capable: true,
    title: "在场",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FFFB" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      data-scroll-behavior="smooth"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        {/* Pre-hydration: set <html class="dark"> before first paint
            to avoid a light↔dark flash on reload. The script reads
            localStorage("sinan:theme") and falls back to system pref.
            self-contained; no module syntax. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
              <KeyboardShortcuts />
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
