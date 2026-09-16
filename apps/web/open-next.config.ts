import type { OpenNextConfig } from "@opennextjs/cloudflare"

// Cloudflare Workers 适配配置 — 适配器强制要求的 override 组合
// （见 ensure-cf-config.js 的校验规则）。
// 司南没有外部缓存依赖，incrementalCache/tagCache/queue 全部用 dummy 内存实现；
// 引入 KV/R2 时再替换对应实现。
const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },
  edgeExternals: ["node:crypto"],
  middleware: {
    external: true,
    override: {
      wrapper: "cloudflare-edge",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },
}

export default config
