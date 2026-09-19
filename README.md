# 在场

在场是一个邀请制的匿名职场信息产品，采用 Web + iOS monorepo。

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
- PR Preview/staging 使用 Vercel + Neon；大陆 production 使用阿里云 ECS + RDS PostgreSQL。
- Web 发布标签为 `web-vX.Y.Z`，iOS 发布标签为 `ios-vX.Y.Z`。
- 生产保持 `INVITE_REQUIRED=true`、`LAUNCH_SCOPE_ONLY=true`，不使用 mock 数据兜底。

完整流程见 [`docs/README.md`](docs/README.md) 和 [`docs/operations-runbook.md`](docs/operations-runbook.md)。
