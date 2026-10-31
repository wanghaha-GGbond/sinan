# 在场 Web v0.0.1

正式入口：[https://zaichang.space](https://zaichang.space)。发布日期：2026-10-31（Asia/Shanghai）。本文件记录已发生的部署，不把标签创建当作部署操作。

## 版本映射

| 项目 | 标识 |
| --- | --- |
| 完整 Web 标签 | `web-v0.0.1` |
| 已部署源码 | `bbaa59905595ead3ece6695d36b0dc5626ff9c65` |
| main 收口提交 | `0bd382a743af32e3fa7fc491604db9df9da4a8bb`（合并 #17） |
| Cloudflare Worker | `zaichang` |
| Worker version ID | `9e17e5f1-83a5-4d09-b5a2-edba2c28a5b0`，100% 流量 |
| 数据库迁移 | `0022_email_registration`，共 23 条迁移，重复执行与哈希核对通过 |
| 认证契约 | `2` |

## 本版内容

- 名称“在场”，绿色 Z 标识；沿用朋友 #4/#6 可取的布局、公司卡片与详情分区，经 #7 安全移植，保留真实 API、10 分制和已有业务边界。
- 公开邮箱验证码注册，不需要邀请码；登录、个人主页、账号找回和注销入口保留。
- 公司搜索/详情、研报列表/详情、评价审核和“有用”投票。
- Cloudflare 运行时兼容修复、每次 Neon 交互事务独立创建并关闭连接池、真实 workerd 启动门禁。
- 海外 Cloudflare Workers + Neon + Resend；没有迁移阿里云或发布 iOS。

生产开关：`INVITE_REQUIRED=false`、`LAUNCH_SCOPE_ONLY=true`、`NEXT_PUBLIC_PULSE_ENABLED=false`、`MAIL_PROVIDER=resend`。发信域名为 `mail.zaichang.space`，支持邮箱为 `support@zaichang.space`。密钥不记录在发布文档。

## 已核验

- #17 七项检查通过；合并后 main 的 Web、iOS、Cloudflare 构建及稳定 staging 成功。
- 独立 Cloudflare staging 的注册/登录、资料、评价审核/公开展示、投票、注销及改密撤销旧会话通过（3 项 E2E 通过，1 项真实邮件专项未启用）。
- 正式 live/ready 均为 200；ready 确认准确 release、当前迁移、有效配置和可达数据库。
- 正式注册配置：无需邀请码，必须验证邮箱，真实发送启用。
- 手机浏览器首页/注册页无运行错误，首页无横向溢出；真实注册页面发送验证码，API 返回 202，服务商报告 delivered。
- 经所有者明确授权，在正式站使用真实已投递验证码创建普通账号，注册返回 201、注册后的 `/api/auth/me` 会话核对成功。随机初始密码未持久保存；密码设置邮件由正式 `after()` 链路发出，服务商报告 delivered。
- 上述账号验收的后续自动检查因测试脚本使用了不存在的清 cookie 方法而停止，不是应用报错；未声称已经完成该账号的独立密码登录验收。所有者仍需通过邮件设置私人密码并登录。
- 正式公司搜索及详情通过（20 家），研报列表及详情通过（10 份）。登录、找回、个人页入口、隐私政策和条款可达；Pulse/社区为 404。
- www HTTPS 308 跳转保留路径与查询参数；Worker 版本预览 URL 已获授权关闭。

服务商 delivered 不等于所有者已经打开邮件；个人页 HTTP 200 不等于认证会话已登录。记录不包含私人邮箱、密码、验证码、token 或用户 ID。

## 数据与失败处理

- 发布前备份分支：`br-super-pine-b3th4yy0`，生产项目内、ready；快照点 `2026-10-31T07:59:38Z`，没有复制到公共 staging。
- 正式库先核验 0000–0020 的 21 条原始哈希，再通过官方 Drizzle migrator 应用 0021/0022；重复执行后全部 23 条哈希一致。首次 CLI 尝试失败但未部分升级，复查后才重试；不执行 down migration。
- 首次升级失败时，所有者已接受暂停访问和前向修复，不回滚旧认证代码。备用维护版本 `d771f221-9699-4fc6-90c5-64e51346d1da` 已准备、未启用。
- 当前成功版本作为认证契约 2 的已验收基线；未来回退仍须检查数据库、契约、包与云端版本映射，不能直接部署历史 UI 标签。

## 制品与证据

- 配置摘要：`ae918edc1377c39098a5eb57e81654880bcf85487940da5e8f89963ccfca6b31`。
- 包摘要：`5ac623ece22f2afe1e6f898d1e585bacd372a20cf02b1c566554aa0d316c6999`。
- [GitHub 首发部署审计](https://github.com/wanghaha-GGbond/sinan/pull/17#issuecomment-6543957711)；该评论形成时账号创建待完成，本文件补充后续真实注册与密码设置邮件证据。
- [UI 移植范围](../archive/ui-v0.0.2-integration.md)、[版本和审批说明](../repository-status.md)。

## 尚不代表完成

这不是 iOS/App Store 发布，不是完整生产运营体系验收。自动生产晋级/回退、备份恢复实战、持续监控告警、服务商配额与账单检查仍需后续工作。#5 的资料/API 增量和正式 Pulse/社区不包含在本次发布。
