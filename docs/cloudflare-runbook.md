# 在场 Cloudflare 海外 Beta

Web 页面和 `/api/*` 一起部署到 Cloudflare Workers。海外 Beta 使用 Neon 项目 `sinan-preview` 的 `main` 分支；`staging` 分支继续隔离测试数据。
保留 monorepo；iOS 独立发布。`DEPLOYMENT_REGION=global` 明确表示海外部署，不套用大陆备案门禁；大陆部署继续使用默认 `mainland` 并保留备案检查。
当前为 staging：邀请制、Pulse 标记体验版、邮件发送关闭。

## 授权与配置

在仓库根目录执行 `npm exec --workspace=@sinan/web -- wrangler login`，完成浏览器授权。
通过 `wrangler whoami` 确认账号。当前可用地址为 `https://zaichang.zaichang.workers.dev`。
尚未购买品牌域名，不要配置或宣传 `sinanapp.cn` 为已拥有的入口；自定义域名待用户选购后绑定。

在 `apps/web` 下使用 `npx wrangler secret put NAME` 分别设置：

- `DATABASE_URL`：本次海外 Beta 的 Neon `main` 连接串。PR Preview 必须使用隔离测试分支，不能接入这个含真实账号的数据库。
- `AUTH_SECRET`：至少 32 字符的独立随机密钥。
- `CRON_SECRET`：独立随机密钥。

Secret 通过交互式标准输入传入，不写入源码、命令参数或日志。
本地 Workers 验证可使用被 Git 忽略的 `apps/web/.dev.vars`。
GitHub Environment 中已有的 secret 不能通过 GitHub API 读回。

## 构建与部署

1. 修改既有数据库前保存恢复分支。在隔离测试分支验证全部当前迁移后，再升级 Beta 数据库并重复执行验证幂等。
2. 设置 `NEXT_PUBLIC_APP_URL` 为真实 HTTPS Worker 地址。
3. 执行 `npm run build:cf --workspace=@sinan/web`。此命令将 API、staging、Pulse 和首发范围开关同时写入客户端构建；仅配置运行时 vars 不足以改变客户端包。
4. 在 `apps/web` 执行 `npx opennextjs-cloudflare deploy --var NEXT_PUBLIC_APP_URL:$NEXT_PUBLIC_APP_URL --var APP_RELEASE:$(git rev-parse HEAD)`。
5. 检查 live/ready、首页、隐私、公司搜索、研报、邀请注册、登录、评价和注销。没有真实 DB/secret 时 ready 应返回 503，不能把 live 200 视为上线成功。

`npm exec --workspace=@sinan/web -- wrangler dev --local --port 8787` 可验证 Worker 包。
当前 OpenNext 的 Node proxy 支持仍有 experimental 提示，部署前必须验证安全头、首发路由限制和鉴权。
默认未配置 R2/KV 持久缓存；不要依赖跨请求的内存状态或缓存保证正确性。

## 当前验收记录

2026-09-16：修复 pg-cloudflare 的 workerd 入口漏打包；OG 路由改用 Node runtime。
OpenNext 构建完成，本地 Workers 的首页、隐私、Pulse、live 返回 200；拍卖路由按首发限制返回 404，安全响应头存在。
没有配置云端账号授权和数据库密钥，ready 返回 503。线上发布、数据库闭环和云端回滚尚待验收。

官方参考：[OpenNext 配置与部署](https://opennext.js.org/cloudflare/get-started)。
