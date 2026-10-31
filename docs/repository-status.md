# 在场版本与仓库状态

核验日期：2026-10-31（Asia/Shanghai）。这是本次整理快照，后续状态以 GitHub 和实际部署为准。

## 当前只认这三个入口

| 用途 | 事实源 |
| --- | --- |
| 一起开发的主线 | `main`；Web/iOS 同仓库、分别构建和发布 |
| 当前完整 Web 发布 | [`web-v0.0.1`](https://github.com/wanghaha-GGbond/sinan/releases/tag/web-v0.0.1) |
| 实际对外服务 | [zaichang.space](https://zaichang.space)，ready 接口报告 Git SHA，而非语义版本 |

没有长期 release 分支。`codex/release-20260815`、`codex/web-uiux-v1-safe-integration` 及本次已合并的修复分支已从远端移除。临时整理分支不是新的生产分支。

生产源码为 `bbaa59905595ead3ece6695d36b0dc5626ff9c65`，已包含在 main 的合并提交 `0bd382a743af32e3fa7fc491604db9df9da4a8bb` 中。`web-v0.0.1` 精确指向已部署源码，不移动到之后的文档提交。详细证据见 [首发记录](releases/web-v0.0.1.md)。

## 朋友的 UI 到底合没合

**可取的 UI 已整合并部署，不需要等待朋友批准才再次上线。** 采用的是在 #7 上移植，而不是将旧 UI 分支全部原样合并。

| PR | 本次处理与边界 |
| --- | --- |
| [#4](https://github.com/wanghaha-GGbond/sinan/pull/4) 三页 UI | 可取视觉已通过 #7 采用；旧提案关闭并留档，不声称整个分支原样合并 |
| [#5](https://github.com/wanghaha-GGbond/sinan/pull/5) 公司资料扩充 | 仍保留待审核；数据、API 和种子 SQL 没有随 UI 自动进入生产。继续时从最新 main 单独提取增量，不能直接合并旧堆叠分支 |
| [#6](https://github.com/wanghaha-GGbond/sinan/pull/6) Glassdoor 风格 | 公司卡片、目录布局、详情分区已移植到 #7；旧提案关闭并留档。社区视觉不等于社区已公开 |
| [#7](https://github.com/wanghaha-GGbond/sinan/pull/7) 安全整合 | 已合并，包含 UI、个人主页、邮箱验证码注册及原有业务基线 |
| [#3](https://github.com/wanghaha-GGbond/sinan/pull/3) Pulse | 不在本次生产范围，保留独立提案；生产仍关闭 |
| [#16](https://github.com/wanghaha-GGbond/sinan/pull/16)、[#17](https://github.com/wanghaha-GGbond/sinan/pull/17) | 已合并；修复 CI、公开注册配置、Cloudflare 运行时及 Neon 事务连接生命周期，已随首发部署 |

原始提交已保留为 `archive/ui-pr4-20261031`、`archive/ui-pr5-20261031`、`archive/ui-pr6-20261031`。本次不删除朋友这些原分支，尤其 #5 仍依赖 #4 的 base；不丢弃尚未采用的工作。Dependabot 分支是独立依赖更新 PR，也不是 release 分支，不在本次盲目删除。

## v0.0.1 为什么曾出现两个说法

- **Web v0.0.1 / `web-v0.0.1`**：当前整个网站的正式发布版本。
- **`ui-v0.0.1`**：10 月 26 日冻结的历史 UI 设计快照，不是当前整站源码，不移动旧标签。
- **“UI v0.0.2 整合记录”**：后续移植 #6 到 #7 的设计文档名称；不是另一个已发布的 Web v0.0.2。
- iOS 尚未随这次 Web 首发发布，不冒用 Web 版本号。

以后对外只说完整 Web 版本。设计迭代另有归档，下一次完整网站更新按实际变化选择 `web-v0.0.2` 等新版本。

## 审批事实，不混淆三种批准

1. 朋友没有 Approve #7；不记录成朋友已审核。
2. 所有者明确授权对 #7/#16/#17 各次操作临时调整人工审批数 `1 → 0`，在 CI 全通过后合并，再恢复 `1`。#7 在 2026-10-31 合入 main，并在本次首发部署。
3. staging 部署审批是访问测试环境密钥的批准，不是 PR 代码批准。

上述是首次上线时的历史审批过程。随后，所有者在 2026-10-31 明确决定：**今后 PR 不再等待朋友批准，main 的必需人工批准数长期设为 0。** 这是新的持续规则，不是把某一次旧豁免延伸到未来；不要再自动恢复成 1。也不要求 Code Owner 或最后提交人之外成员批准。

新规则下仍保留严格同步、管理员保护、讨论解决、禁止强推与删除，以及原三条必需检查：Web quality/audit/build、PostgreSQL migrations/core flows、iOS typecheck/release config/export。此次没有关闭 staging/production 部署审批；当前 staging 仍要求所有者批准工作流使用测试密钥。

## 后续两人怎么做

从最新 main 开一个短期分支 → 提一个主题明确的 PR → CI/隔离 Preview（部署审批与 review 分开）→ 检查通过、讨论已解决且同步主线后即可合并，不必等另一人批准 → 删除已合并分支 → 单独执行受控正式部署 → 记录新版本和实际 SHA。

这次文档整理不再次部署、不改生产数据、不开放 Pulse/社区、不发布 iOS。当前仓库仍是公开仓库；私有化不是本次已完成事项，需单独确认其权限和套餐影响。
