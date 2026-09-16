import path from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

const appDirectory = path.dirname(fileURLToPath(import.meta.url))
const isVercelBuild = process.env.VERCEL === "1"
// @opennextjs/cloudflare 打包自己的 worker 入口，standalone 输出只服务于
// 阿里云 ECS/SAE 的容器部署，两者互斥。
const isCloudflareBuild = process.env.CLOUDFLARE === "1"

const nextConfig: NextConfig = {
  // Keep the development route badge out of visual QA captures; compile and
  // runtime errors remain visible in the terminal and browser console.
  devIndicators: false,
  // 127.0.0.1 is a default dev access host on this machine; without this
  // entry Next blocks /_next/static chunks and HMR for it.
  allowedDevOrigins: ["127.0.0.1"],
  ...(isVercelBuild || isCloudflareBuild
    ? {}
    : {
        output: "standalone" as const,
        outputFileTracingRoot: path.resolve(appDirectory, "../.."),
      }),
  // Next traces the default Node entry, but Workers uses pg-cloudflare's
  // workerd entry. Include that entry from the monorepo's hoisted dependencies.
  ...(isCloudflareBuild
    ? {
        outputFileTracingRoot: path.resolve(appDirectory, "../.."),
        outputFileTracingIncludes: {
          "/*": ["../../node_modules/pg-cloudflare/dist/**", "../../node_modules/pg-cloudflare/esm/**"],
        },
      }
    : {}),
}

export default nextConfig
