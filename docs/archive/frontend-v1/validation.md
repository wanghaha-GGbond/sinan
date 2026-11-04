# V1.0 RC1 验收记录

记录日期：2026-10-26（Asia/Shanghai）。这是候选版本归档，不是已合并、已部署或业务零风险的证明。

## 基线

- 整合分支：`codex/web-uiux-v1-safe-integration`。
- main 基线：`470e92992992572b4720478c0419d55309b782dd`。
- 纳入的 release 基线：`3e80ec30dc653562f44e5faf243613b9854d7b81`，包含 main 尚未接收的 33 个提交。
- UI 参考：PR #4 的 `f694562c563ddb2ba98d750d10f82ae62537e509`，选择性移植，不整包合并。
- 原 PR #1/#4 保留；#3 Pulse、#5 公司资料扩充、#6 另一套设计均未纳入。
- 本次 UI 增量未修改 API、数据库迁移、认证、审核和评分算法；完整整合 PR 仍包含 release 原有业务变更，必须单独验收。

## 本地结果

Node.js 22.22.3；Next.js / eslint-config-next 16.4.3；系统 Chrome。以下测试在定向依赖修复后重跑：

| 检查 | 结果 | 说明 |
| --- | --- | --- |
| Web 生产依赖审计 | 通过 high/critical 门槛 | 0 high、0 critical；3 moderate 未清零 |
| Web lint | 通过 | 0 error；用户资料页已有 2 条内部导航 warning |
| Web typecheck | 通过 | `tsc --noEmit` |
| Web 单测 | 83/83 | 包括接口契约、生产边界、隐私、会话及评分口径 |
| 研究算法测试 | 5/5 | 未改变算法 |
| Cloudflare 发布策略测试 | 5/5 | 不是部署结果 |
| UI/交互测试 | 23/23 | 五种宽度、菜单、筛选、键盘、重试、深色模式、缓存复用 |
| npm 10 的 `ci --dry-run` | 通过 | 隔离目录验证锁文件可解析；不等于完整 CI 安装 |
| iOS typecheck | 通过 | iOS 源码未改 |
| iOS 生产依赖审计 | 阻断 | 5 high、3 moderate；详见下文 |
| Web 生产构建 | 通过 | Next.js 16.4.3；不带应用密钥，本地验证 |
| Cloudflare production 打包 / dry-run | 通过 | OpenNext 1.20.6、Wrangler 4.132.0；不上传，不切换流量 |
| PostgreSQL 集成 / release E2E | 本轮未运行 | 本机没有可用 PostgreSQL/Docker 服务；须通过隔离 CI |
| 已部署隔离 Preview | 未完成 | 缺少 staging 配置，不能用生产库替代 |

此前 iOS release config（CI 模式）和 production export 通过，但缺少真实 EAS projectId / ascAppId；不是 TestFlight 发布证明。最终版本仍以远端对应提交检查为准。

Cloudflare 本地打包保留了上游 Node middleware experimental 和生成 bundle 的重复 `options` key 警告；dry-run 通过不证明 Worker 运行时无风险。构建发生于未提交工作区，manifest 标记 dirty / validationOnly，明确不能用于正式发布。远端 staging 构建和真实 Preview 仍须独立验证。

### 依赖处理

Next.js 16.3.4 → 16.4.3，配套 eslint-config-next 同步；定向更新 zod、compression、source-map-js、sharp 等传递依赖，以及 brace-expansion、shell-quote、ip-address 的已有覆盖值。
没有采用无锁全量更新，没有强制降级 Expo，也没有把 Expo 依赖的 Zod 3 强制替换成不兼容的 Zod 4。

npm 10 在原有嵌套 workspace 树下保留旧 Next 锁记录；使用隔离 npm 11 解析旧锁后得到定向更新，再验证 npm 10 的 CI 解析。不要求维护者升级全局 npm。
锁文件含依赖提升/路径变化，审阅可用 `git diff --diff-algorithm=minimal`；没有扩大为几百个包的最新版本升级。

剩余安全问题：

- Web：fast-uri / ajv、moment 的 moderate，后续独立修复。
- iOS：Expo CLI 依赖链的 node-forge 和 Zod 3；不能靠关闭审计或 `npm audit fix --force` 掩盖。当前审计给出的 Expo 降级建议是破坏性变化。
- 参考上游：[node-forge 签名验证](https://github.com/advisories/GHSA-86w9-cpqp-85rv)、[Zod 内存耗尽](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)。需选择并验证兼容修复后重跑 iOS 门禁。

## 截图归档

所有图片来自本地环回端口、空数据库连接、关闭邮件的 fixture 测试。北辰等公司和样本数是测试数据，不是线上真实数据。Pulse 只在此 development 测试中显示，生产继续受现有 flag 约束。

| 页面 | 手机 390px | 桌面 1440px |
| --- | --- | --- |
| 首页 | [截图](screenshots/home-390.png) | [截图](screenshots/home-1440.png) |
| 公司目录 | [截图](screenshots/companies-390.png) | [截图](screenshots/companies-1440.png) |
| 公司概览 | [截图](screenshots/detail-390.png) | [截图](screenshots/detail-1440.png) |

[深色目录](screenshots/directory-dark.png)。`screenshots/` 还保存 375、768、1280px，合计 16 张；校验值见 [SHA256SUMS](screenshots/SHA256SUMS)。截图为历史快照，不是自动像素差异断言，也不能替代真实数据的验收。

## 合并前剩余条件

1. 配好 GitHub `staging` Environment：Vercel 资源 ID/token、Neon 项目与无生产数据的 staging 父分支、NEON_API_KEY、独立 AUTH_SECRET / CRON_SECRET。密钥只进安全配置，不进 PR 或聊天。
2. Preview 工作流现在会逐项列出缺失配置名称并失败，不输出密钥值，不伪装成功。
3. 当前提交通过 Web、PostgreSQL、iOS、UI 与 Cloudflare 构建；完成真实隔离 Preview 验收。旧 PR 的绿色检查不代表此提交通过。
4. 另一位开发者审核 PR 并联合验收截图/交互。保留管理员保护与人工批准，不自动合并。
5. 发布前另行确认真实邮件、数据库 `0021` 与 `session_version`、备份和兼容回退版本；不能把旧 Worker `ea4117e2-094a-495f-9ab7-3694e006a6cb` 当作已验证的账号找回回退点。

本轮没有生产部署、数据库写入、真实注册发信或流量切换。正式 V1 冻结时新增合并 SHA、发布记录和验收结论，保留本 RC1 记录。
