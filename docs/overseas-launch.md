# 在场海外运营上线清单

更新：2026-10-29（Asia/Shanghai）。本文件记录待办与验收证据，不表示已部署或已购买资源。

## 发布对象与当前证据

- UI 基线：`ui-v0.0.1`，整合 PR [#7](https://github.com/wanghaha-GGbond/sinan/pull/7)，包含三页 UI、个人主页、邮箱验证码注册及账号找回。
- 正式网页入口：`https://zaichang.zaichang.workers.dev`。
- 10 月 29 日读取 Cloudflare 部署列表：当前 100% 流量版本 `ea4117e2-094a-495f-9ab7-3694e006a6cb`，消息 `copy-cleanup-f318506`，仍是 9 月旧版。该版本不能默认作为认证升级后的安全回滚目标。
- PR `e943fbc` 的 Web、UI 回归、PostgreSQL 与 Cloudflare 两套打包通过；Preview 等待 staging 审批，PR 等待另一位成员审核，iOS 依赖审计失败。后续修复提交必须重新验收。
- 测试 Resend 邮件已投递到所有者邮箱并由所有者确认收到；这不等于任意邮箱可注册，也不等于 Cloudflare 生产邮件已接通。
- 本轮正式站点 HTTP 探测从当前执行环境超时；不能据此判定网站宕机，也不能记录健康验收通过。

## 购买与资源选择

需要购买的是自有域名，以及按实际用量选择托管套餐。继续使用现有代码、Cloudflare 和 Neon，不需要另购网站模板或重建系统。

| 项目 | 建议 | 开通条件 |
| --- | --- | --- |
| 域名 | 优先简短、与“在场”一致，比较首年与续费价 | 用户选定具体域名、实时可注册状态和价格后付款 |
| Cloudflare | 沿用 Worker；正式运营评估 Workers Paid，官方最低 $5/月，超额另计 | 核实当前套餐、用量与预算后升级，不把域名购买当作套餐升级 |
| Neon | 保持正式与 Preview 数据隔离；评估 Launch 的恢复能力与按量账单 | 核实当前实际恢复窗口，配置用量提醒并演练恢复 |
| Resend | 验证自有发信子域名，如 `mail.<域名>`，先按实际邮件量选择套餐 | DNS 验证通过、真实外部邮箱投递通过 |
| 支持邮箱 | `support@<域名>`，由团队实际收件 | 收发测试通过后才写入页脚、条款和邮件 |

价格来源：[Cloudflare Workers](https://developers.cloudflare.com/workers/platform/pricing/)、[Cloudflare Registrar](https://developers.cloudflare.com/registrar/)、[Neon](https://neon.com/pricing)。域名和云资源费用分开计算；本轮未产生购买或套餐升级。

## 发布顺序

1. 修复当前 PR 必需检查，另一位开发者批准后按保护规则合入 main。staging Environment 审批用于测试密钥访问，不能替代代码审核。
2. 域名购买并获得 DNS 管理权后：绑定 Worker 自定义域名，等待 HTTPS 生效；明确主域名与跳转规则，保留旧网址过渡。
3. 按 Resend 控制台提供的真实记录配置 DKIM/SPF；设置 DMARC 策略并验证。不猜测 DNS 记录，不覆盖已有邮箱 MX。
4. 更新真实生产 `NEXT_PUBLIC_APP_URL`、`MAIL_FROM_DOMAIN`、`SUPPORT_EMAIL` 和 Resend secret；删除测试收件人限制，生产不能使用 `onboarding@resend.dev`。
5. 记录生产 Neon 分支与恢复点；在隔离环境验证全部迁移及重复执行，再应用生产兼容迁移。不得运行 `db:push` 或 down migration。
6. 从 main 干净提交构建 production，保存 manifest 与 authContract；上传候选并验证，再切换流量。首次认证升级需要可用的同契约回退制品，不能把旧 Worker 自动回滚当作已解决。
7. 验证首页、公司列表/详情、研报、注册/验证码、登录、个人主页、评价、找回密码、注销；核验 `/api/health/live`、`/api/health/ready` 的 release 与迁移信息。
8. 邀请小范围用户使用，观察错误与邮件失败；验收完成后记录正式 URL、Git SHA、Worker version ID、迁移、恢复点与回退版本。

## 开放运营前

- 隐私政策、服务条款与真实支持入口；确认实际运营者信息、数据保存与注销处理方式后填写，不杜撰主体。
- 保持邀请制、评价审核、请求限流和邮件频率限制；Pulse、社区、私聊、拍卖及用户付费不随本次 UI 发布开放。
- Cloudflare 日志及外部健康探针，明确真实告警接收人。连续健康失败、注册发信失败、5xx 上升需要可追踪的告警；配置完成后实际触发一次测试。
- Neon 恢复演练与发布前恢复点；记录恢复耗时和可接受的数据损失窗口，不能仅凭“开通付费”认定备份有效。
- 域名、云平台和 GitHub 采用团队权限与各自账号，开启双重验证；账单、到期续费与故障处理有明确负责人。
- 发布记录只写实际通过的检查；运营者确认、域名付款、另一位成员审核及告警接收等仍需对应人员完成。

Resend 共享测试域名只能向账号所有者发信：[官方限制说明](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)。网站可以先使用免费地址，但公开邮箱注册仍需完成正式发信配置。
