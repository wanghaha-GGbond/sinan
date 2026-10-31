# 司南中国大陆生产发布手册

## 当前发布边界

- 单一 monorepo：Web 在 `apps/web`，iOS 在 `apps/ios`，共享代码在 `packages/shared`。
- 唯一生产分支为 `main`；发布工作从短期 release 分支通过 PR 合入。
- Web 先发布，稳定后再提交 TestFlight 和中国大陆 App Store。
- 首发保持 `INVITE_REQUIRED=true` 与 `LAUNCH_SCOPE_ONLY=true`。
- Production 固定 `NEXT_PUBLIC_PULSE_ENABLED=false`；Pulse 只在 staging 体验。
- 正式域名为 `sinanapp.cn`；备案完成前不得把大陆 ECS 作为公开正式服务。

## 需要人工完成的外部资源

这些步骤涉及付款、实名认证或账号所有权，不能由 CI 自动代办：

1. 以备案主体本人信息注册并实名认证阿里云账号。
2. 实名购买 `sinanapp.cn`，域名持有人与备案主体保持一致。
3. 在 `cn-hangzhou` 购买满足备案条件的 ECS、RDS PostgreSQL 16、ACR、DirectMail、SLS 与云监控。
4. 提交网站 ICP 备案和 `com.sinan.app` 的 APP 备案。
5. 注册 Apple Developer Program，运行 `eas init`，把真实 `projectId` 写入 `app.json`。
6. 在 App Store Connect 创建 App，把真实 `ascAppId` 写入 `eas.json`。

## 阿里云资源约束

- ECS、RDS 必须位于杭州同一 VPC；RDS 仅设置 ECS 私网白名单。
- ECS 安全组公网只开放 80/443；SSH 只允许固定管理 IP。
- Node 容器只绑定 `127.0.0.1:3000`，由 Nginx 接流。
- ECS 绑定 RAM 实例角色，供 DirectMail 和 ACR 临时令牌使用。
- GitHub OIDC 角色只授予目标 ACR 推送、目标 ECS 云助手执行所需的最小权限。
- 生产环境变量保存在 KMS Secrets Manager 的通用凭据中；ECS RAM 实例角色仅允许读取该凭据，发布时生成 `/opt/sinan/web.env`，权限设为 0600，不放入 GitHub、镜像或仓库。

## GitHub 配置

创建 GitHub Environment `production`，建议设置人工审批。配置以下 Repository Variables：

- `ACR_REGISTRY`：例如 `registry-vpc.cn-hangzhou.aliyuncs.com`
- `ECS_INSTANCE_ID`
- `RDS_INSTANCE_ID`
- `KMS_SECRET_NAME`
- `ALIYUN_GITHUB_ROLE_ARN`
- `ALIYUN_GITHUB_OIDC_PROVIDER_ARN`

不配置阿里云主账号 AccessKey。OIDC 信任策略只允许仓库
`wanghaha-GGbond/sinan` 的 production environment。

`main` 分支保护要求：

- 禁止直接 push。
- 必须通过 Web、PostgreSQL 或对应 iOS 检查。
- 至少一人批准；合并后自动删除功能分支。

## ECS 首次初始化

1. 安装 Docker、Nginx、jq、curl、阿里云 CLI 和 Cloud Assistant Agent。
2. 在 KMS Secrets Manager 创建 Generic 凭据，`SecretData` 使用 `deploy/web.env.example` 的变量格式填入真实值；不要把凭据内容提交 Git。
3. 为 ECS RAM 实例角色授予目标凭据的 `kms:GetSecretValue`，并在 GitHub production Environment 设置 `KMS_SECRET_NAME`。
4. 创建 `/opt/sinan`，首次可用 `deploy/scripts/sync-web-secrets.sh <secret-name>` 生成 `/opt/sinan/web.env`；确认权限为 0600。
5. 把 `deploy/nginx/sinan.conf` 安装到 Nginx 配置目录。
6. 备案完成并解析域名后签发证书，再启用 443 配置。
7. 为 Docker、Nginx 和部署日志配置 SLS 采集，并按 [`deploy/monitoring/README.md`](../deploy/monitoring/README.md) 创建云监控和外部探针。

生产环境必须包含：

```text
DATABASE_ADAPTER=pg
MAIL_PROVIDER=aliyun-direct-mail
ERROR_REPORTING_MODE=stdout
NEXT_PUBLIC_APP_URL=https://sinanapp.cn
NEXT_PUBLIC_ICP_FILING_NUMBER=<已备案编号>
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_API_ENABLED=true
NEXT_PUBLIC_PULSE_ENABLED=false
LAUNCH_SCOPE_ONLY=true
INVITE_REQUIRED=true
```

## Web 发布

1. 在可丢弃 staging PostgreSQL 16 上从迁移目录事实源执行全部当前迁移，再重复执行一次。
2. 运行 Web CI、数据库并发测试、release E2E 和研报指数算法测试。
3. 创建 `web-v*` 标签；发布工作流只接受 `main` 已包含的提交。
4. 工作流重新审计依赖，构建 Web standalone 与 migrator 两个同 SHA 镜像，并执行 Trivy HIGH/CRITICAL 扫描。
5. 工作流先创建并确认 RDS 发布前备份，再通过 ECS 云助手运行 migrator。
6. 云助手在 3001 端口验证候选镜像的 `/api/health/ready`，通过后切换 3000；失败保持或恢复上一镜像。
7. 逐项验收注册、登录、验证码、评价审核/展示、研报指数、有用投票和账号注销。
8. 邀请用户开放后至少观察 30 分钟，再扩大范围。

数据库不执行向下迁移。应用故障回滚镜像；数据故障使用前向修复或 RDS 备份恢复。

## iOS 发布

1. Web/API 稳定后配置真实 EAS `projectId`、App Store Connect `ascAppId`。
2. 在 EAS Production 环境设置真实 `EXPO_PUBLIC_APP_FILING_NUMBER`。
3. Preview 使用 `https://staging.sinanapp.cn`，Production 使用 `https://sinanapp.cn`。
4. 运行类型检查、release config、Expo Doctor 和 production export。
5. 构建 TestFlight，小范围验证全部首发流程。
6. 核对隐私政策、支持 URL、App Privacy、审核账号、截图和 APP 备案信息。
7. 创建指向 `main` 的 `ios-v*` 标签；GitHub 工作流构建并提交 TestFlight，审核通过后手动发布。

## 监控与回滚

- SLS 收集结构化应用错误、Nginx access/error 和部署日志。
- 云监控覆盖 CPU、内存、磁盘、容器存活和 RDS 连接数。
- 外部探针每分钟访问 `/api/health/ready`。
- 连续三次失败、核心写入失败或 5xx 激增触发回滚。
- RDS 每日自动备份，发布前额外手动备份。
- 每月将最新备份恢复到隔离 staging，记录实际 RTO、RPO 和关键表抽样结果。

## 合并后的仓库收口

release PR 合入 `main` 且归档标签已推送后，才删除已合并远端分支：

- `web-dev`
- `ios-dev`
- `feat/m3-auction-track-a`
- 两个 recovery 分支

最终长期仅保留 `main`。不要在 PR 合入和生产验证前提前删除恢复分支。

## 当前已知外部阻断

- 域名购买、阿里云资源、ICP备案、APP 备案尚需主体本人付款和实名操作。
- GitHub CLI 当前授权已过期，仓库私有化、分支保护复核和 PR #1 合并需重新登录后完成。
- staging 的新 Vercel Token、Neon project/API key/数据库连接串仍需写入 GitHub `staging` Environment；旧 Token 已失效，不能继续使用。
- EAS 未登录，因此真实 `projectId`、`ascAppId` 和 APP 备案号尚未写入；iOS 发布工作流会在这些值缺失时 fail closed。
