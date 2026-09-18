import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "在场 · 职场方向助手",
    short_name: "在场",
    description: "匿名公司方向评分、真实评价与可追溯公司研报。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#F8FFFB",
    theme_color: "#19C37D",
    categories: ["business", "productivity", "social"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
