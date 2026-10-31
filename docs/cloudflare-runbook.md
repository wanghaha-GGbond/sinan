# 在场 Cloudflare Web 发布手册

范围：海外 Web、Next.js + OpenNext + Cloudflare Workers + Neon；保留 monorepo，iOS 不随 Web 发布。

## 域名接入进度（2026-10-31）

- 自有域名 `zaichang.space` 已在账号中激活，并绑定到现有 `zaichang` Worker；未开启公开版本预览，也未购买额外套餐。
- `https://zaichang.space` 首页 HTTPS 返回 200，`/api/health/live` 返回 `{"status":"ok","service":"zaichang"}`。这仅证明旧站已接入新域名，不代表新 UI 或邮箱注册已发布。
- 线上仍为版本 `ea4117e2-094a-495f-9ab7-3694e006a6cb`（`copy-cleanup-f318506`）。旧 `workers.dev` 地址保留。
- 新发布配置将 `NEXT_PUBLIC_APP_URL` 和自定义域名路由统一为 `https://zaichang.space`，保留 `workers_dev` 兜底；不能只改控制台变量，因为公开 URL 也会进入客户端构建。
- 新 UI 的 30 项页面/注册交互回归在正式构建下全部通过，96 项单测、类型检查及发布策略测试通过，lint 无错误。页面测试不再依赖开发服务器 HMR，未删除或弱化业务断言。
- 新域名配置的 OpenNext 打包、Wrangler upload dry-run 与绑定类型生成通过；本次使用 `CF_VALIDATION_ONLY=true` 的不可发布制品，没有上传新版或修改线上变量。
- PR #7 尚未合并：上一提交的 iOS 审计被 `decode-uri-component <=0.5.0` 高危漏洞阻断，另有 Preview 审批和合并审批未完成。不能以 Web 本地通过代替这些门禁。
- 正式库只读检查确认缺少 `registration_codes`、`password_reset_tokens`、`users.session_version` 和 `users.email_verified_at`。未执行正式迁移；先备份，验证全部当前迁移，再进行兼容升级。
- `mail.zaichang.space` 的四条 Resend DNS 记录已导入并全部验证通过；授权测试邮件的服务商状态为 `delivered`。这仅验证邮件通道，不代表正式应用注册已接通。
- `www.zaichang.space` 已新增代理 CNAME，并启用明确 HTTPS 匹配的 308 跳转；实测保留路径和查询参数，主站返回 200。
- 正式发送凭据、支持邮箱转发、数据库迁移及新版发布仍待完成。注册尚不可用；不能将配置齐备等同于注册验收成功。

### 2026-10-31 发布依赖修复

- Expo 57 的 `query-string@7.1.3` 依赖旧版 `decode-uri-component`，触发 GHSA-qr28-fpjm-wq7f。仅将该依赖覆盖为官方修复版 `0.5.1`，不升级整个 Expo。
- 修复版为 ESM，旧调用方需要函数。`patches/query-string+7.1.3.patch` 只兼容默认导出；`patch-package --error-on-fail` 在安装时应用，失败则中止，不修改解码算法、不屏蔽审计。
- 已通过 iOS 生产依赖审计（0 high/critical，仍有 low/moderate）、类型检查、production export，以及中文、重复参数、空值、畸形编码和大输入超时回归。`npm ci` 干净安装成功应用补丁，3 项兼容性测试通过，Web 生产审计同样为 0 high/critical。待远端 CI 验证后才能合并。

## 历史准备状态（2026-10-03）

现有入口保留为 `https://zaichang.zaichang.workers.dev`。本次只完成本地构建、检查脚本和 CI 配置，**没有上传 Worker、创建 staging Worker、修改线上变量或执行线上迁移**。邮件账号、域名和真实发信仍未验收。目标配置不等于已上线状态。

旧 `apps/web/wrangler.jsonc` 是历史 Beta 配置，不能直接拿它覆盖正式版本。`deploy:cf` 现在拒绝直接部署，防止延续硬编码 staging 的旧命令。

## 两套独立配置

| 项目 | staging | production |
| --- | --- | --- |
| Worker | `zaichang-staging`，尚未创建 | `zaichang`，保留现有入口 |
| API 和邀请制 | 开启 | 开启 |
| Pulse | 体验版开启 | 导航隐藏、路径 404 |
| 数据库 | 独立无真实用户数据的 Neon 分支 | 真实用户库，发布前备份 |
| 邮件 | 默认关闭 | Resend，必须验证域名和实际投递 |
| 版本预览 URL | 关闭 | 关闭，避免候选旁路公开 |

脚本生成各自完整配置，不依赖环境继承。`NEXT_PUBLIC_*` 同时进入客户端和 Worker vars。每次构建覆盖本机 `.release` / `.open-next`，两个环境不能在同一目录并行构建。

没有品牌域名仍可使用 workers.dev 网页入口；**发信域名是另一个前置条件**。不要假定 `sinanapp.cn` 已拥有或其支持邮箱可用。

## 本地构建与检查（无远程写入）

仓库根目录执行：

```sh
npm run test:release-cf --workspace=@sinan/web
npm run build:cf --workspace=@sinan/web -- staging
```

production 构建需要在进程环境设置公开参数 `CF_MAIL_FROM_DOMAIN`、`CF_SUPPORT_EMAIL`，再运行：

```sh
npm run build:cf --workspace=@sinan/web -- production
npm run release:verify-cf --workspace=@sinan/web -- production
```

参数检查只验证格式，不证明域名归属或投递成功，必须另行验收。不要设置假的生产邮箱绕过准备工作。

构建执行 OpenNext 打包、Wrangler `versions upload --dry-run` 和绑定类型生成，不会上传。构建进程清空已知应用密钥与 Cloudflare 凭证，不需连接数据库。

`.release/manifest.json` 记录 Git SHA、最新迁移、会话安全契约、目标环境、公开配置及包摘要。`.release` 被 Git 忽略；实际发布后应保存 manifest，并补充 Cloudflare version ID、备份/迁移证据和验收记录。

`release:verify-cf` 拒绝未提交代码、校验专用构建、目标不一致及包/配置变化。它只验证本地制品，**不证明云端配置或数据库准备完成**。

CI 的两套构建使用 `CF_VALIDATION_ONLY=true` 和 `.invalid` 邮箱，标记为不可发布，不持有云端凭证。现有 Web CI 继续承担审计、类型、单测、迁移与端到端门禁。新增 workflow 推送后才会在 GitHub 生效；所有者还需把实际检查名加入分支保护。

## 正式发布前的人工门禁

1. 合并经另一位开发者批准的 PR；发布源必须在 `main`，提交和构建一致。Web 标签只生成 Release 草稿，不代表已部署。
2. 创建隔离 staging Worker 并配置独立 Neon 测试库。不要复制含真实用户的生产分支作为公共 Preview。
3. 每个 Worker 分别配置 secrets：`DATABASE_URL`、至少 32 字符的 `AUTH_SECRET`、`CRON_SECRET`，正式环境另需 `RESEND_API_KEY`。通过控制台或明确 Worker/config 的交互式 secret 命令输入，不写入 vars、命令参数、日志或仓库。
4. GitHub 配置需人工批准的发布 Environment；未来上传使用受限 Cloudflare API Token。当前新增 workflow **只有检查，没有自动上传/切流量**。
5. staging 应用全部当前迁移并重复验证；确认缺少迁移时 ready 为 503。生产先创建可恢复备份，再应用兼容迁移。当前最新为 `0022_email_registration`，认证契约为 `2`，详见 [邮箱注册验收](email-registration.md)。
6. 验收真实邮件、支持邮箱、注册登录、找回改密、研报、评价审核、投票和注销。仅使用授权测试账号。
7. 核实认证兼容的回滚基线。**现有旧版本可能没有 session_version 检查，不可默认拿它回滚。** 首次升级未制定兼容回滚方案前，不开放实际改密。
8. 完成准备后，再启用候选上传、受保护探针、批准切流量及失败处理。OpenNext `upload` 可上传候选而不立即接管流量；默认禁止公开 preview URL，所以本次没有假装已有候选探针。新 Worker 的入口/触发器需单独确认，上传不等于开站。

## 健康检查与回滚

- live 只检查进程；ready 检查配置、数据库、当前迁移记录和认证关键字段。缺少迁移/表/字段返回 503，不读取用户记录。
- ready 成功返回 `release`、`migration`、`authContract`，不含密钥、用户数据或数据库错误详情，响应不缓存。
- 记录实际 Worker version ID 与 manifest 的对应关系。下面只是本地兼容检查，**不会执行回滚，也不替代旧包摘要与远程版本核验**：

```sh
npm run release:check-rollback-cf --workspace=@sinan/web -- production /absolute/path/previous-manifest.json
```

- 仅接受同 Worker/环境、同迁移、相同会话安全契约的另一已验证版本。跨迁移回滚另行审查。
- 实际改密后不能退回不检查 session_version 的旧应用，否则旧令牌可能重新有效。数据库不做 down migration。
- 本地检查不构成防绕过的权限控制；云端权限、GitHub 审批、版本核验和回滚演练仍待完成。

## 已知限制

未新增收费缓存服务，保留现有 dummy 缓存。Node proxy/middleware 仍有 experimental 警告，打包依赖还有重复 options 键警告，需保留路由/安全头验证。尚未完成云端 `after()` 真发信、Neon 恢复演练、自动候选探针/晋级/回滚。

历史 schema 快照与手写迁移有差异；不要执行 `db:push` 或未审阅的自动差异。阿里云旧流水线改为人工触发且要求 `WEB_PRODUCTION_PLATFORM=aliyun`，Web 标签不会再同时触发它。

官方参考：[OpenNext CLI](https://opennext.js.org/cloudflare/cli)、[Worker 环境隔离](https://developers.cloudflare.com/workers/wrangler/environments/)、[回滚与数据库限制](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)。
