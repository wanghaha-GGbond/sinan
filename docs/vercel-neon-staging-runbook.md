# 司南 Vercel Preview + Neon Staging 测试手册

这套环境只用于内测，不承载生产数据，也不替代阿里云生产发布。

## 环境边界

- Vercel 项目：`web`，代码目录为 `apps/web`。
- Preview 环境：使用独立 Neon staging 分支。
- `NEXT_PUBLIC_APP_ENV=staging`、`NEXT_PUBLIC_API_ENABLED=true`、`LAUNCH_SCOPE_ONLY=true`。
- 保持 `INVITE_REQUIRED=true`，测试人员通过一次性邀请码注册。
- 禁止设置 `ALLOW_DEV_AUTH=true`，禁止连接生产数据库。

## Vercel 项目设置

在 Vercel 项目 `web` 中确认：

1. Git 仓库连接到 `wanghaha-GGbond/sinan`。
2. Root Directory 使用 `apps/web`（沿用已有项目链接）。
3. Framework 选择 Next.js。
4. Preview 部署来自 staging 分支或 Pull Request；不要使用 `vercel --prod` 做测试。
5. 为 Preview 配置一个稳定的 `NEXT_PUBLIC_APP_URL`。如果暂时没有 DNS，可使用本次部署的 `*.vercel.app` 地址；正式测试建议绑定 `staging.sinanapp.cn`。

## Preview 环境变量

以下变量必须配置在 Vercel 的 Preview Environment，不能写入仓库：

```text
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_API_ENABLED=true
LAUNCH_SCOPE_ONLY=true
INVITE_REQUIRED=true

DATABASE_ADAPTER=neon
DATABASE_URL=<Neon staging branch connection string>
AUTH_SECRET=<random secret, at least 32 characters>
CRON_SECRET=<random secret>
APP_RELEASE=staging-<git-sha>

NEXT_PUBLIC_APP_URL=https://<stable-staging-url>
NEXT_PUBLIC_ICP_FILING_NUMBER=<real filing number when required>
SUPPORT_EMAIL=<staging support mailbox>

# 仅测试非邮件流程时可使用 disabled；测试企业邮箱验证码前改为 resend
MAIL_PROVIDER=disabled
# RESEND_API_KEY=<staging-only key>
MAIL_FROM_DOMAIN=<verified sender domain>
ERROR_REPORTING_MODE=stdout
```

`MAIL_PROVIDER=disabled` 仅允许用于 `staging`。此时注册、登录、公司、评价等
非邮件流程可测试，企业邮箱验证码接口会安全返回不可用，且不会把邮箱或验证码
写入日志。Production 仍强制要求 Resend 或阿里云邮件推送。

如果使用阿里云 DirectMail，可以把邮件变量替换为 `ALIYUN_DM_ACCOUNT_NAME` 和 `ALIYUN_DM_REGION`。不要把任何 token、数据库连接串或密钥提交到 Git。

## Neon 初始化

1. 从空的 staging 分支执行全部数据库迁移。
2. 再次执行迁移，确认幂等。
3. 用一个专用测试管理员用户作为邀请码归属人，预置 50–100 个 `unused` 邀请码。
4. 不要从生产数据库复制真实用户、邮箱、手机号或评价内容。

当前应用没有公开的批量邀请码管理页；邀请码需要由 staging 运维脚本或受控 SQL 预置。每个邀请码只允许注册一次。

## 发布前检查

```bash
npm run release:check-env --workspace=@sinan/web
npm run db:check --workspace=@sinan/web
npm run typecheck --workspace=@sinan/web
npm run test:unit --workspace=@sinan/web
npm run build --workspace=@sinan/web
```

部署完成后确认：

- `/api/health/live` 返回 `200`。
- `/api/health/ready` 返回 `200`，并显示数据库可连接。
- 注册、登录、搜索公司、公司详情、写评价、举报、屏蔽和注销端到端可用。
- 被暂缓的社区、圈层、私聊、拍卖等功能仍保持关闭。

## 测试人员使用方式

把新的 Vercel Preview 地址和一条一次性邀请码发给测试人员：

```text
https://<staging-url>/invite/<invite-code>
```

测试人员在邀请页进入注册，使用邮箱或手机号、至少 8 位密码完成注册。注册成功后即可登录并测试评价主链路；同一邀请码不能重复使用。

## 晋级生产

测试通过后才允许：

1. 合并已批准的 PR 到 `main`。
2. 创建 `web-v*` 发布标签。
3. 由 `.github/workflows/release-web.yml` 构建并部署到阿里云 ECS/ACR。
4. 将数据库、域名、邮件、备案号和支持邮箱切换到生产配置。

Vercel Preview 只是测试环境，不应直接作为中国大陆正式生产入口。
