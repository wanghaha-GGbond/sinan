# iOS 灰度发布清单

首版只发布 iPhone，使用 `0.2.0 (1)`，并保持 `EXPO_PUBLIC_LAUNCH_SCOPE_ONLY=true`。版本来源已固定为 `app.json`（EAS 使用 `appVersionSource: local`）。当前 Expo 57 原生模块的最低 iOS 版本是 **16.4**，因此 Release 配置使用 16.4；如果必须支持 iOS 15.1，需要先把 Expo/RN 整体降级并重新验证，不在本次灰度范围内。原生 App 继续使用 Solid 视觉；Web 端的网页组件不会迁移到这里。

## 本地验证

```sh
npm run typecheck
npm run export:ios
npm run release:check-config:ci
```

`release:check-config` 会拒绝 localhost、未开启首发范围、占位备案号和错误 API 协议。`--ci` 只允许 EAS/ASC ID 缺失并输出警告，方便在 CI 中先检查其余配置。

## TestFlight 前必须补齐的外部配置

1. 在 `app.json` 写入 `expo.extra.eas.projectId`，并在 `eas.json` 的 `submit.production.ios.ascAppId` 写入 App Store Connect 数字 ID。
2. 在 EAS 环境中设置 staging/production API、真实 APP/ICP 备案号和 `support@sinanapp.cn`。
3. 为 `staging.sinanapp.cn`、`sinanapp.cn` 配置 DNS、HTTPS、数据库和鉴权；`/api/health/ready` 必须返回 `200`。
4. 执行数据库迁移，包含 `0019_review_author_blocks.sql`，并确认举报队列可处理。
5. 登录 Apple Developer/EAS 后执行：

```sh
npx eas-cli build --platform ios --profile preview
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --profile production
```

没有真实 EAS 项目、ASC App ID、备案号和生产域名时，不要用占位值提交商店。

## 灰度验收

- 内部 TestFlight 10–20 人运行 5 天，再邀请 50–100 人运行 7–14 天。
- 真机验证推荐、搜索、公司详情、研报、登录、注册、写评价、有用、举报、屏蔽和注销。
- 覆盖 iPhone SE、标准尺寸和 6.9 英寸设备，iOS 16.4 与当前正式版，弱网/断网/升级/登录过期/后台恢复。
- P0/P1 连续 7 天为零后才提交正式审核；隐私泄露举报必须能在 24 小时内进入人工队列。
