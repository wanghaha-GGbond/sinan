# 在场 Web UI v0.0.1 · 固化记录

日期：2026-10-26。用户确认本版 UI 固化，正式 UI 基线版本号为 **v0.0.1**。

归档说明（2026-10-31）：下文保留冻结当时的状态，不改写原标签。后续 UI 已通过 #7 整合并随 [完整 Web v0.0.1](../releases/web-v0.0.1.md) 上线；不要将下面的“生产尚未发布/等待批准”当成当前状态。

**UI 基线已冻结；生产尚未发布。** 此记录不表示 main 已合并、CI 全绿或数据库已升级。

## 版本身份

- 归档标签：`ui-v0.0.1`，只用于设计与前端基线追溯，不触发 Web/iOS 发布流程。
- 冻结的代码提交：`b934d6dab6a621017b544a78188ed57417c6a0fc`。
- 纯 UI 实现提交：`5600826`；依赖修复提交：`a9859a8`。
- [整合 PR #7](https://github.com/wanghaha-GGbond/sinan/pull/7)，目标 `main`；当前仍为 Draft / BLOCKED / REVIEW_REQUIRED。
- 标签所在归档提交只增加本记录和文档入口，应用代码与上述冻结提交相同。
- 历史目录 `frontend-v1` 中的“V1.0 RC1”是本版形成过程的旧名称，保留原文不覆盖；对外 UI 版本统一为 v0.0.1。

## 固化内容

首页、公司目录、公司概览，以及共用公司行、10 分制评分、加载骨架、筛选、搜索与导航。
保留绿色品牌主题、真实评分口径、原请求缓存及业务入口；不包含 PR #5/#6、iOS 改版或正式 Pulse。

- [固定提交的前端 PRD](https://github.com/wanghaha-GGbond/sinan/blob/b934d6dab6a621017b544a78188ed57417c6a0fc/docs/archive/frontend-v1/PRD.md)
- [固定提交的验收记录](https://github.com/wanghaha-GGbond/sinan/blob/b934d6dab6a621017b544a78188ed57417c6a0fc/docs/archive/frontend-v1/validation.md)
- [16 张归档截图](https://github.com/wanghaha-GGbond/sinan/tree/b934d6dab6a621017b544a78188ed57417c6a0fc/docs/archive/frontend-v1/screenshots)
- [截图 SHA256 清单](frontend-v1/screenshots/SHA256SUMS)

截图为隔离本地测试数据，不代表线上雇主表现。标签指向整个 monorepo 快照，但不是 iOS 或完整产品的发布版本。

## 已核验结果

以下远端结果对应冻结提交 `b934d6d`，不引用其他 PR 的检查：

| 检查 | 结果 |
| --- | --- |
| Web 审计、lint、类型、单测、算法与生产构建 | [通过](https://github.com/wanghaha-GGbond/sinan/actions/runs/40330290974/job/121597592959) |
| PostgreSQL 16 全量/重复迁移、集成、核心 release E2E | [通过](https://github.com/wanghaha-GGbond/sinan/actions/runs/40330290974/job/121597593331) |
| Cloudflare staging / production 打包与 dry-run | [通过，未部署](https://github.com/wanghaha-GGbond/sinan/actions/runs/40330291207) |
| UI 回归 | 本地 23/23；记录时[远端任务](https://github.com/wanghaha-GGbond/sinan/actions/runs/40330290974/job/121597593224)仍在执行，不能算通过 |
| 隔离 Preview | [失败](https://github.com/wanghaha-GGbond/sinan/actions/runs/40330290987)，缺 Neon 与独立认证配置 |
| iOS 安全审计 | [失败](https://github.com/wanghaha-GGbond/sinan/actions/runs/40330291031)，5 high / 3 moderate |
| 另一位成员代码审核 | 尚无 GitHub approval；用户对 UI 基线的确认不代替受保护分支的代码审核 |

## 上线前置条件

1. 补齐 staging 的 `NEON_PROJECT_ID`、`NEON_STAGING_BRANCH`、`NEON_API_KEY`、独立 `AUTH_SECRET` / `CRON_SECRET`，使用不含真实用户数据的测试库，并通过 Preview。
2. 兼容修复 iOS 上游依赖安全问题，完成当前提交所有必需检查；不能关闭审计或强制降级 Expo 掩盖风险。
3. 另一位开发者审核，按保护规则合入 main。
4. 依照 [Cloudflare 发布手册](../cloudflare-runbook.md)，验证真实邮件、备份、`0021_password_recovery`、`session_version` 以及认证兼容回退方案，再上传候选与切流量。

PR #7 包含原 release 的 33 个提交，不能把整体发布误称为“只改 UI”。旧生产 Worker 不能默认用作新账号找回逻辑的安全回退版本。

## 后续变更规则

不移动或覆盖 `ui-v0.0.1` 标签。后续 UI 修订使用 v0.0.2 等新版本，通过新提交保存差异。
生产部署成功后新增发布记录，填写合并 SHA、Cloudflare version ID、迁移/备份、健康与回退证据；不把此次 UI 冻结记录改写成已上线证明。
