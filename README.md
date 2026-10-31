# 在场

在场是一个匿名职场信息产品，采用 Web + iOS monorepo。当前海外 Web 已开放邮箱验证码注册，不需要邀请码。

## 当前发布

- 正式站：[zaichang.space](https://zaichang.space)。完整网站版本：**Web v0.0.1**，标签 [`web-v0.0.1`](https://github.com/wanghaha-GGbond/sinan/releases/tag/web-v0.0.1)。
- 唯一长期主线：`main`；没有长期 release、web-dev 或 ios-dev 分支。短期分支通过 PR 合并。
- 朋友 UI 的可取部分通过 PR #7 整合并上线，不需要再合并旧 PR #4/#6。
- [版本与 PR 状态](docs/repository-status.md) · [Web v0.0.1 发布记录](docs/releases/web-v0.0.1.md) · [协作规则](CONTRIBUTING.md)。

## 目录

- `apps/web`：Next.js 页面、API、Drizzle schema 与数据库迁移。
- `apps/ios`：Expo/React Native iOS 客户端。
- `packages/shared`：Web 与 iOS 共用的类型和逻辑。
- `deploy`：Web 容器、ECS 部署和 Nginx 配置。
- `docs`：产品规格、发布、恢复和运维手册。

## 本地开发

```bash
npm ci
npm run dev:web
```

Web 默认运行在 `http://localhost:3000`。iOS 使用 `npm run dev:ios`。

## 提交前检查

```bash
npm run audit:release
npm run lint --workspace=@sinan/web
npm run typecheck --workspace=@sinan/web
npm run test:unit --workspace=@sinan/web
npm run research:test:algorithm --workspace=@sinan/web
npm run typecheck --workspace=@sinan/ios
npm run release:check-config:ci --workspace=@sinan/ios
```

## 发布边界

- Web 和 iOS 使用同一个 `main`，但分别构建、分别发布。
- 当前海外 production 使用 Cloudflare Workers + Neon + Resend。PR Preview 使用 Vercel + 独立 Neon 分支；Cloudflare staging 使用独立 Worker/测试库。
- 阿里云 ECS + RDS 是保留的大陆部署方案，不是当前正式站；本次没有进行大陆或 iOS 发布。
- Web 发布标签为 `web-vX.Y.Z`，iOS 发布标签为 `ios-vX.Y.Z`。
- 当前海外生产为 `INVITE_REQUIRED=false`、`LAUNCH_SCOPE_ONLY=true`、`NEXT_PUBLIC_PULSE_ENABLED=false`；邮箱验证、审核和限流保留，不使用 mock 数据掩盖故障。
- 标签记录版本，不等于自动部署。当前 Cloudflare 发布仍需显式构建、验证和切换流量。

完整流程见 [`docs/README.md`](docs/README.md) 和 [`docs/operations-runbook.md`](docs/operations-runbook.md)。
