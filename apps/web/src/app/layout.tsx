import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/app-shell";
import { FirstRunHint } from "@/components/layout/first-run-hint";
import { KeyboardShortcuts } from "@/components/layout/keyboard-shortcuts";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "司南 | 入职前，先看清方向",
  description: "匿名公司方向评分、真实评价、薪资区间与企业认证平台。",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
              <FirstRunHint />
              <KeyboardShortcuts />
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
