import path from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

const appDirectory = path.dirname(fileURLToPath(import.meta.url))
const isVercelBuild = process.env.VERCEL === "1"

const nextConfig: NextConfig = {
  ...(isVercelBuild
    ? {}
    : {
        output: "standalone" as const,
        outputFileTracingRoot: path.resolve(appDirectory, "../.."),
      }),
}

export default nextConfig
