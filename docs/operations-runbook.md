# 在场工程与运维 Runbook

## 当前海外上线入口（2026-10-29）

当前选择为 **Cloudflare Workers + Neon**；下面原有 ECS/RDS 段落属于历史大陆方案，不是当前生产操作指引。
实际发布按 [Cloudflare 发布手册](cloudflare-runbook.md)；域名、邮件和运营验收按 [海外运营上线清单](overseas-launch.md)。

## 环境与负责人

- Local：开发和单元测试，不连接生产数据。
- Staging：Vercel + Neon，使用独立数据库和测试账号。
- Production：Cloudflare Worker `zaichang` + Neon，邀请制，`LAUNCH_SCOPE_ONLY=true`；真实生产库与 Preview 隔离。
- Production：`NEXT_PUBLIC_PULSE_ENABLED=false`，Pulse 不进入公开生产路由。
- 平台、数据库、CI/CD、云资源和发布：`wanghaha-GGbond`。
- Web UI、视觉验收和 App Store 素材：`g2561845325-debug`。

## 发布前

1. PR 通过 Web/iOS CI、数据库检查和 Preview。
2. 确认 release tag 指向 `main`，记录 Git SHA。
3. 核对迁移目录中的全部当前迁移为向前兼容；不执行 down migration。
4. Web 发布前创建 Neon 可恢复备份并记录生产分支、恢复点和迁移版本；iOS 是独立发布任务。

## Web 回滚

当前 Cloudflare：记录发布 manifest、Git SHA 和 Worker version ID；先检查认证契约及迁移兼容性，再切回已验证的版本。不能直接退回不校验 `session_version` 的 9 月旧版本。详见 [Cloudflare 健康检查与回滚](cloudflare-runbook.md#健康检查与回滚)。

以下容器步骤仅适用于将来重新启用阿里云方案：

- 候选容器 ready 失败：保持当前容器不变。
- 新容器切流后异常：使用记录的上一镜像 SHA重新启动。
- 数据库异常：停止继续发布，保留日志，使用前向修复或隔离恢复，不现场删表。
- 回滚后验证 `/api/health/live`、`/api/health/ready`、登录、评价读取和研报读取。

## 告警处理

- 连续 3 次 ready 失败、5xx 超过 5%、磁盘或 RDS 连接超过 80%：通知发布负责人。
- 先确认最近发布和依赖状态，再决定应用回滚或数据库恢复。
- 每次事故记录发生时间、影响范围、处置、RTO、数据损失窗口和后续修复。

## 发布演练记录

至少完成并记录一次：正常发布、候选镜像 ready 失败、应用回滚、RDS 备份恢复。发布失败时保留当前镜像；数据库只做前向修复或隔离恢复。

## 恢复演练

当前 Neon 每月至少演练一次从恢复点还原到隔离分支，抽查用户、评价、研报和投票关键表，并记录实际 RTO/RPO。恢复分支不得接入公网 Preview；验证后按明确的清理审批处理。

## 版本记录

Web 使用 `web-vX.Y.Z`，iOS 使用 `ios-vX.Y.Z`。发布记录必须包含：版本标签、Git SHA、镜像 SHA、迁移版本、发布人、结果和回滚目标。
