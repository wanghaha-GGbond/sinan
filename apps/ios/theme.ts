// 司南色彩系统 — 完全对齐 apps/web 的 Solid C 端风格
// Web 端参考: apps/web/src/app/globals.css

export const COLORS = {
  // 品牌色
  primary: "#19C37D",
  primaryDark: "#0E8F5F",
  primarySoft: "#DFF8EC",
  primaryForeground: "#07563A",

  // 中性色
  ink: "#111827",
  inkSoft: "#1F2937",
  textSecondary: "#374151",
  muted: "#6B7280",
  mutedLight: "#9CA3AF",

  // 背景
  bg: "#F7F8F2",
  surface: "#FFFFFF",
  surfaceMuted: "#F9FAF7",
  surfaceHover: "#F1F5EF",

  // 边框
  border: "#E5E7DB",
  borderSoft: "rgba(229,231,219,0.6)",

  // 语义色
  risk: "#C76A15",
  riskForeground: "#92400E",
  riskSoft: "#FFF1D6",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  gold: "#D4A017",

  // 暗色（用于 dark 按钮 / header）
  dark: "#111827",

  // 别名（兼容旧代码）
  card: "#FFFFFF",
  darkSecondary: "#374151",
  primaryLight: "#DFF8EC",
} as const

// 对齐 Web: rounded-2xl(16px) card, rounded-[18px] button, rounded-3xl(24px) hero
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
} as const

export const PRODUCT = {
  scoreName: "方向分",
  valueName: "方向值",
  streakName: "连续点灯",
  levelName: "指路等级",
  badgeName: "司南徽章",
  reviewerName: "过来人",
  newcomerName: "后来者",
} as const

// 3D 按钮阴影 (iOS 用 elevation + shadowColor 模拟)
export const SHADOWS = {
  buttonPrimary: {
    shadowColor: "#0E8F5F",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  buttonSecondary: {
    shadowColor: "#D1D5C8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  card: {
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.045,
    shadowRadius: 18,
    elevation: 6,
  },
  cardSubtle: {
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.055,
    shadowRadius: 18,
    elevation: 5,
  },
  iconContainer: {
    shadowColor: "#0E8F5F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 0,
    elevation: 3,
  },
  hero: {
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.03,
    shadowRadius: 0,
    elevation: 2,
  },
} as const
