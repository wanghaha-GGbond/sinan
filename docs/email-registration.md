# 在场邮箱注册

## 当前生产验收（2026-10-31）

已随 [Web v0.0.1](releases/web-v0.0.1.md) 在 `zaichang.space` 上线；海外正式站为 `INVITE_REQUIRED=false`，没有邀请码要求，仍须真实邮箱验证码。正式验证码投递、真实注册 201 与注册后会话核验通过；正式密码设置邮件已投递，私人密码由所有者自行设置。尚未把该账号独立密码登录记录为通过。

下方 10 月 28 日等记录为历史排障证据，不表示目前仍缺域名、等待 #7 批准或邮件关闭。当前版本、审批例外和未完成项见 [仓库状态](repository-status.md)。配置示例默认邀请制适用于 staging；当前海外 production 使用已验证的 `mail.zaichang.space` 和公开注册配置，不使用 `resend.dev`。

## 功能范围

本次在现有账号体系上增加邮箱验证码，不迁移身份提供商，不改已有登录密码或会话。

1. 未登录用户通过导航「注册」进入 `/register`。
2. 填写邮箱和邀请码（邀请制开启时），点击「获取验证码」。
3. 输入邮件里的六位验证码、密码和确认密码。
4. 注册成功后自动登录，默认进入 `/me`；有效的站内 `next` 路径继续保留。
5. 个人主页可以编辑昵称和资料，保留评价、收藏、邀请、技能、高光、身份认证及账号注销入口。

邮箱验证仅证明邮箱归属，不会自动提高职场身份认证等级，也不会用邮箱前缀生成公开昵称。

## 接口与安全约束

- `GET /api/config/register`：返回邀请制、邮箱验证要求及邮件配置可用性；禁止缓存。配置齐备不代表投递已验收。
- `POST /api/auth/register-code`：接收 `email`、可选 `inviteCode`。只有发信服务接受请求后才返回 `202`；缺配置或发送失败返回 `503`，限流返回 `429` 和 `Retry-After`。
- `POST /api/auth/register`：增加必填的六位 `verificationCode`；Web 和 iOS 都不能绕过。手机号不再作为新注册入口，已有账号登录不受影响。
- 验证码随机生成、15 分钟有效、60 秒重发间隔、每邮箱每小时最多发送 5 次，并叠加 IP 限流。
- 数据库仅保存邮箱摘要和带服务端密钥的验证码摘要，不保存明文验证码；错误 5 次锁定，重发替换旧码。
- 验证码消费、新用户创建和邀请码消费使用同一个数据库事务及行锁，避免并发重复注册或失败后丢失验证码。
- 不配置固定验证码、不在部署环境降级假注册、不在日志输出邮箱或邮件内容。

## 数据库与兼容性

应用全部当前迁移，最新为 `0022_email_registration`：新增 `registration_codes` 和 `users.email_verified_at`。
旧账号不回填未经证明的验证时间，账号注销清除验证标记。

readiness 与 Cloudflare 发布制品的 `authContract` 升为 `2`，避免回滚到不要求邮箱验证码的注册实现。
迁移先在隔离测试库验证；正式库备份、迁移和应用切换必须另行记录，不执行 down migration。

## 实际发信前置条件

海外部署沿用已有 Resend 适配器，需要在运行环境配置：

```text
MAIL_PROVIDER=resend
MAIL_FROM_DOMAIN=<在 Resend 验证通过的发信域名>
RESEND_API_KEY=<仅保存在受控运行环境中的发送凭证>
DATABASE_URL=<目标环境独立连接串>
AUTH_SECRET=<至少 32 字符的随机密钥>
INVITE_REQUIRED=true
```

现有发件格式为 `no-reply@MAIL_FROM_DOMAIN`。`workers.dev` 网页入口与发信域名是两件事，不能把未拥有的 `sinanapp.cn` 当成已验证域名。

可选 `MAIL_FROM_ADDRESS` 必须属于 `MAIL_FROM_DOMAIN`。发信配置使用同一份规则进行注册可用性、readiness 和发布前检查；空白密钥、非法域名、跨域发件地址均拒绝。

没有自有域名时，只能在独立 staging 中验收账号本人收信：设置 `MAIL_FROM_DOMAIN=resend.dev`、`MAIL_FROM_ADDRESS=onboarding@resend.dev`、`MAIL_TEST_RECIPIENT=<Resend 账号本人邮箱>`，再配置该环境独立的 `RESEND_API_KEY`。其他收件人会在调用服务商前被拒绝；production 禁止此测试模式。此配置不意味着其他用户可以注册。参考 [Resend 测试域限制](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)。不要将真实收件地址提交到 Git。

`MAIL_PROVIDER=disabled` 时注册页面明确显示暂不可用，不能据此声称用户已经可以邮箱注册。
真实投递仅发送到用户明确授权的测试收件人，不将收件地址写入测试配置或文档。

## 验证与已知限制

- 单元测试：随机码、摘要绑定、无密钥拒绝、Web/iOS 禁止绕过、配置变化与无假发送成功。
- 数据库集成测试：单次消费、并发消费、失败次数、过期、未投递、事务回滚和重发失败。
- 页面回归：移动端注册、倒计时、自动进入个人主页、昵称编辑、发送错误和邮件禁用。
- release E2E：在隔离数据库中捕获测试投递并验证真实注册、登录、本人资料和公开资料隐私；此测试不是外部邮件投递证明。
- 2026-10-28 已创建独立 PostgreSQL 16 测试项目 `zaichang-staging`，未复制原 `sinan-preview` 数据。
- 本地验证：90 项单测、18 项真实 Neon 数据库集成测试、26 项页面回归、5 项算法测试、Web 生产构建及 iOS 类型检查通过；全部迁移和重复迁移通过。
- 注册到登录、本人/公开资料隔离、评价和注销的单条 release E2E 在隔离 Neon 上通过。远程数据库总链路允许 180 秒，CI 本地 PostgreSQL 仍保留 60 秒；业务断言没有删减。
- 全套 release E2E 首轮在远程数据库上另有两项找回密码浏览器用例失败；随后 GitHub 的 PostgreSQL 16 核心流程任务（run `40542760823`）完整三项通过。隔离测试中的投递捕获仍不代表真实邮件送达。
- 真实发信、正式库迁移和部署尚未验收；测试通过不等于已经上线。

UI 历史标签 `ui-v0.0.1` 保持不变，本功能是该冻结版本之后的增量。

## 2026-10-28 配置与部署修复

- 邮件配置统一校验；staging 的单收件人测试模式不会带入 production。
- Vercel 流水线不再通过命令行参数传入 Token、数据库连接串和应用密钥，而是从已有受控环境读取；CLI 固定版本 `59.5.0` 已检查支持此用法。
- Preview 健康探针使用已认证的 `vercel curl`，不关闭 Deployment Protection；校验当前 Git SHA、全部当前迁移、`authContract=2` 和注册接口字段，防止将旧服务的 HTTP 200 当成新版本已上线。
- 本地验证：96 项单元测试、类型检查、Web 生产构建、5 项 Cloudflare 发布策略测试通过；lint 0 错误、2 项既有导航警告；工作流 YAML 和 21 段 shell 语法检查通过。未重新执行远程数据库写入或真实发信。

仍需外部完成的步骤：

1. Neon 的 GitHub OAuth/MCP 登录不等于 GitHub Actions 拥有 Neon API Key。将测试项目所需的最小权限 Key 直接保存到仓库 `staging` Environment 的 `NEON_API_KEY`，不要发在聊天或 PR 中。项目与父分支变量分别是 `NEON_PROJECT_ID` 和 `NEON_STAGING_BRANCH`。
2. 在目标运行环境配置独立的 `RESEND_API_KEY`。没有验证过的自有发信域名，只能按上文进行账号本人测试，不能向公众开放注册。
3. iOS 审计仍受 Expo 依赖链中的 [node-forge 未修复漏洞](https://github.com/advisories/GHSA-86w9-cpqp-85rv) 和 [Zod 旧版本漏洞](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) 阻断。未关闭审计、添加豁免或强制跨大版本替换依赖。
4. PR #7 仍需另一位开发者批准，且必需检查通过才能合并；随后才能迁移正式库并发布。真实邮件和线上完整注册仍未验收。

### 部署权限后续核查

- 2026-10-28 Preview 第二次执行（run `40649869929`、job `122697088769`）已通过配置项检查，随后在 `Link Vercel project` 报 `You do not have access to the specified account`。这不是 UI 编译失败，也不能仅凭此消息断定项目 ID 错误。
- 已在流水线增加精确项目只读预检（`scripts/vercel-access.mjs`）：区分凭据 401、项目/团队访问 403/404、错误项目或构建根目录。凭据与服务商响应正文均不输出到日志；预检失败时不创建 Neon 分支、不部署。
- 预检本地 5 项测试、Web 类型检查和 lint 通过（0 错误、2 项既有 warning）。工作流 YAML 与 shell 语法检查通过；这不是云端权限恢复的证明。
- staging 已保存新的项目限定 `NEON_API_KEY` 和仅发送权限 `RESEND_API_KEY`，并启用所有者部署审批、关闭管理员绕过。现有 Preview 仍保持 `MAIL_PROVIDER=disabled`，保存邮件密钥不等于已经启用注册发信。
- 新 Vercel 部署 Token 拟仅授权 `web` 项目、有效 30 天，等待所有者明确确认后创建并保存至受保护 staging；不使用临时 MCP 认证凭据作为持久 CI 密钥。
- 朋友 PR #4 的三页 UI 已在 `5600826` 选择性移植，来源与取舍保留在 `docs/uiux-v1-baseline.md`。无需再次覆盖相同文件；代码整合、合并主线和生产部署分别记录。
- 生产注册仍需自有且完成 Resend 验证的发信域名。没有域名时只能在 staging 对授权本人邮箱验收；不会把 `resend.dev` 测试发件人用于公开生产注册。
