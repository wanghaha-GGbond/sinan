# 司南 iOS TestFlight 发布手册

## 已纳入构建的发布配置

- Bundle ID：`com.sinan.app`
- Beta 版本：`0.2.0`，build number 由 EAS 远端自动递增。
- 生产会话使用 Web API JWT，并存放在 iOS Keychain；Web 预览使用 AsyncStorage。
- `EXPO_PUBLIC_API_URL` 必须指向已通过 Web Beta 发布门禁的 HTTPS 域名。
- preview 与 production 构建固定启用 `EXPO_PUBLIC_LAUNCH_SCOPE_ONLY=true`，旧 mock/P2 deep link 会返回首页，不能进入发布包流程。
- Expo app config 声明了 Privacy Manifest required-reason API；EAS CNG 构建时生成原生清单。

## 首次关联

1. 准备付费 Apple Developer 与 Expo 账号。
2. 在 App Store Connect 创建 Bundle ID 为 `com.sinan.app` 的应用，记录 ASC App ID。
3. 在 `apps/ios` 执行 `npx eas-cli init`，将生成的 EAS project ID 写入 app config。
4. 在 EAS 的 production environment 配置 `EXPO_PUBLIC_API_URL`，不得使用 localhost 或 HTTP。
5. 将 ASC App ID 写入 `eas.json` 的 `submit.production.ios.ascAppId`；不要提交 Apple 密钥。

## 验收与提交

1. 设置生产 API 后运行 `EXPO_PUBLIC_API_URL=https://你的生产域名 npm run release:check-config --workspace=@sinan/ios`。该门禁会拒绝 HTTP、localhost、未关联 EAS project 和缺少 ASC App ID。
2. `npm run verify --workspace=@sinan/ios`，完成 TypeScript、发布配置和 iOS bundle 三重检查。
3. `npm run build:simulator --workspace=@sinan/ios`，验证邀请注册、登录、搜索和公司详情。
4. 在真机验证 Keychain 会话跨重启保留，注销后失效。
5. 完成 App Store Connect 隐私问卷：账号联系方式、用户内容、诊断数据（如启用错误追踪）；声明不用于跨应用追踪。
6. 按 `docs/ios-store-listing.md` 准备截图、Beta 描述、反馈邮箱和审核测试邀请码。
7. `npm run build:testflight --workspace=@sinan/ios`。
8. `npm run submit:testflight --workspace=@sinan/ios`。提交后检查 Apple 的 Privacy Manifest 邮件，再开放外部测试。

EAS Submit 会上传到 TestFlight，不会自动提交 App Store 正式审核。Apple/Expo 账号、签名证书、ASC App ID 与商店素材属于外部状态，必须由账号持有人完成或授权。
