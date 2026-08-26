# 司南工程与运维 Runbook

## 环境与负责人

- Local：开发和单元测试，不连接生产数据。
- Staging：Vercel + Neon，使用独立数据库和测试账号。
- Production：阿里云 ECS + RDS PostgreSQL，邀请制，`LAUNCH_SCOPE_ONLY=true`。
- Production：`NEXT_PUBLIC_PULSE_ENABLED=false`，Pulse 不进入公开生产路由。
- 平台、数据库、CI/CD、云资源和发布：`wanghaha-GGbond`。
- Web UI、视觉验收和 App Store 素材：`g2561845325-debug`。

## 发布前

1. PR 通过 Web/iOS CI、数据库检查和 Preview。
2. 确认 release tag 指向 `main`，记录 Git SHA。
3. 核对迁移目录中的全部当前迁移为向前兼容；不执行 down migration。
4. Web 发布前创建 RDS 手动备份；iOS 发布前确认隐私、备案和审核信息。

## Web 回滚

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

每月至少把最新 RDS 备份恢复到隔离 staging，抽查用户、评价、研报和投票关键表，并记录实际 RTO/RPO。恢复数据不得重新暴露给公网。

## 版本记录

Web 使用 `web-vX.Y.Z`，iOS 使用 `ios-vX.Y.Z`。发布记录必须包含：版本标签、Git SHA、镜像 SHA、迁移版本、发布人、结果和回滚目标。
