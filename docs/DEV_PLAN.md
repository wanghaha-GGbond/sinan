# 司南 (Sinan) 开发计划 v1.0

> 生成日期：2026-06-10。对应 PRD v0.1，已采纳两项决议：
> ① 产品名走中文雅致系（沿用"司南"）；② 拍卖功能化推迟到 M3，M2 用纯运营公益专场代替。
>
> 节奏假设：2 周一个 Sprint，1-2 名全栈。若只有 1 人，每个 Sprint 的"可砍项"先砍。

---

## 总览

| Sprint | 阶段 | 主题 | 核心交付 |
|---|---|---|---|
| S0 | 当前 | 收尾 + 还债 | 提交在途工作、修验证表外键、收导航 |
| S1-S2 | M0a | 真·三级验证 | L1 邮箱验证码闭环、L2 审核后台、验证→trustLevel 联动 |
| S3-S4 | M0b | 身份卡 + 邀请制 | 卡面组件、双面卡、邀请码注册、引荐链 |
| S5-S6 | M1a | 部门级评价 | departments 表、部门 tab、五维评分、k-匿名 |
| S7-S8 | M1b | 违约库 + 情绪指数 | 承诺对照库、周 K 聚合、分享截图卡 |
| S9-S10 | M2 | 引爆支撑 | 拍卖运营页（表单级）、传播素材打磨、指标看板 |

---

## Sprint 0：收尾 + 技术债（本周，3-5 天）

趁 `company_verifications` 表还没有生产数据，把便宜的债先还掉。

### T0.1 提交在途的 verification 工作
- 工作区有大量未提交改动（migration 0007/0008、`company-verification/` 页面、API route）。
- 自测通过后 commit，作为后续所有工作的基线。

### T0.2 修复 company_verifications 外键 【必做，越晚越贵】
- `src/db/schema/company-verifications.ts`：
  - `companyId: text` → `uuid` + `references(() => companies.id)`
  - `applicantUserId: text` → `uuid` + `references(() => users.id)`
  - 新增 `reviewedByUserId`（uuid, FK users）、`reviewedAt`、`rejectReason`（为 S1 审核后台预留）
  - 新增 `grantedTrustLevel: integer`（审批时实际授予的等级，留审计痕迹）
- 重新生成 migration（替换或追加 0008）。
- 同步修改 `api/company-verifications/route.ts` 的插入逻辑。

### T0.3 聚焦主线：收起非主线导航
- `components/layout/app-shell.tsx`：从导航移除 salaries / benefits / jobs 入口（路由保留，不删代码）。

### T0.4 种子数据
- 准备 Top 20 目标公司种子（`companies.source = 'platform_seed'`），含部门草稿数据（S5 用）。

---

## Sprint 1-2：真·三级验证（M0a）

目标：L1 从"填邮箱"变成"验邮箱"，L2 有人工审核闭环，验证结果驱动 `users.trustLevel`。

### T1.1 L1 企业邮箱验证码闭环 【L】
- 新表 `email_verification_codes`：`id, verificationId(FK), codeHash, expiresAt, attemptCount, consumedAt`。
- 发信要求（风控决议：防留痕）：
  - 中性发件人（如 `no-reply@<中性域名>`），邮件标题与正文不出现产品名/"职场评价"等字样，只有验证码。
  - 验证码 6 位，15 分钟过期，单 verification 最多 5 次尝试，复用 `lib/server/rate-limit.ts` 限发信频率（同邮箱 1 分钟 1 封、1 小时 5 封）。
- 邮件服务：接入一家 ESP（建议先用 Resend/SES 任一，封装在 `lib/server/mail.ts`，可替换）。
- API：
  - `POST /api/company-verifications/[id]/send-code`
  - `POST /api/company-verifications/[id]/confirm-code` → 命中后 verification 直接 `approved`（L1 无需人工）
- 公司域名校验升级：除现有公共邮箱黑名单外，增加"邮箱域名 ↔ 公司"映射表（`companies` 加 `emailDomains: jsonb`），域名不匹配时进入人工队列而非直接拒绝。

### T1.2 验证 → trustLevel 联动 【M，核心开关】
- `lib/server/verification.ts` 新建 `approveVerification()`：同一事务内更新 verification 状态 + `users.trustLevel = GREATEST(trustLevel, granted)`。
  - work_email → 1；business_document → 2；salary_proof → 3（枚举本期预留值，功能 M3 再做）。
- `enums.ts`：`companyVerificationProofTypeEnum` 追加 `salary_proof`（migration 只加枚举值，无 UI）。
- 用户被吊销验证（造假发现）时的 `revoked` 状态与 trustLevel 回落逻辑一并实现。

### T1.3 L2 人工审核后台 【M】
- 仿照现有 `api/moderation/review-reports` 的模式：
  - `GET /api/moderation/company-verifications`（队列，moderator/admin）
  - `PATCH /api/moderation/company-verifications/[id]`（approve/reject + reason）
- 审核 SOP 写进 `docs/verification-sop.md`：工牌/在职证明查验要点、敏感信息脱敏要求（审核后删除原件，只留审核结论——PIPL 最小化原则）。
- 简单的 moderator 队列页面（管理界面可以丑，能用即可）。

### T1.4 /me 验证状态展示 【S】
- `app/me/page.tsx`：当前验证等级、进行中的申请状态、下一级引导。

**S1-S2 验收**：新用户可走通 注册 → 提交 L1 → 收码 → 确认 → trustLevel=1 全流程；moderator 可审完一笔 L2。

---

## Sprint 3-4：身份卡 + 邀请制（M0b）

### T2.1 身份卡组件 【L，本产品的脸面】
- 新组件 `components/identity/identity-card.tsx`：
  - 正面：公司 + 职级带 + 年限 + 1 个高光时刻；材质随 trustLevel（0/1=哑光、2=金属、3=黑金），CSS 渐变+纹理实现，**不出现 L1/L2/L3 字样**。
  - 背面（翻转交互）：`reputationScore`、评价被采纳数、被感谢数（采纳数=其 review 的 `usefulCount` 聚合，已有数据）。
- `users` 表扩展：`jobBand`（职级带文本）、`yearsOfExperience`、`highlightMoment`、`declinedOffer`（拒绝陈列位，text，nullable）。
  - `highlightMoment` 与 `declinedOffer` 走人工审核后可见（复用 moderation 思路，加 `profileFieldsStatus` 简化版即可）。
- 挂载点：`/me` + 公开主页（新路由 `app/u/[id]/page.tsx`）。

### T2.2 邀请制 【L，注册流改造】
- 新表 `invites`：`id, code(唯一短码), inviterUserId(FK), invitedUserId(FK,nullable), status(unused/used/revoked), createdAt, usedAt`。
- 规则引擎（`lib/server/invites.ts`）：
  - 初始配额：用户达到 trustLevel ≥ 1 时发放 3 个邀请码（不是注册即发——防小号自激活）。
  - 返还机制：被邀请人达到 trustLevel ≥ 2 时，邀请人配额 +1（上限 6）。
- 注册流改造：`api/auth/register/route.ts` 增加 `inviteCode` 必填校验（环境变量 `INVITE_REQUIRED=true` 开关，方便内测期切换）；注册成功事务内核销邀请码。
- 展示：`app/u/[id]` 与 `/me` 显示"由 XX 引荐"（链到邀请人主页）。
- `/me` 增加邀请管理区：剩余名额、已发出邀请的状态。

### T2.3 注册页与登录页适配 【S】
- `app/register/page.tsx` 增加邀请码输入（支持 URL 预填 `?invite=`）。

**S3-S4 验收**：关闭公开注册后，仅持邀请码可注册；身份卡在两种 trustLevel 下肉眼可辨材质差异；邀请返还链路有集成测试。

---

## Sprint 5-6：部门级评价 + k-匿名（M1a）

### T3.1 departments 表 【M】
- 新表 `departments`：`id, companyId(FK), name, aliasNames(jsonb), status, createdAt`。
- `reviews` 加 `departmentId`（nullable FK；存量 `departmentHint` 自由文本保留，后台逐步归一到部门）。
- 提交评价流（`app/submit/review/page.tsx`）：部门改为下拉 + "找不到我的部门"申报（进 moderation 队列建新部门）。

### T3.2 五维评分结构化 【M】
- 定义固定 schema（zod，放 `lib/types.ts`）：`pay_worth / growth / leader / overtime_truth / promise_delivery`，1-5 分。
- `questionnaire` jsonb 按此 schema 校验写入；`api/reviews/route.ts` 与提交页同步改。
- 聚合：`lib/server/company-view.ts` 增加按公司/按部门的五维均分与样本数（先实时 SQL 聚合，量大再物化）。

### T3.3 k-匿名展示规则 【M，法务红线，和 T3.1 同期上线】
- 规则集中在 `lib/server/anonymity.ts` 单一函数，公司页/评价流/API 全部过它：
  - 部门内 trustLevel ≥ 1 的发布者 < 5 人 → 该部门评价在展示层归并到公司级，部门 tab 显示"样本不足"。
  - 段位标签模糊化：样本不足时"某 L7 验证用户"降级为"某高 P 验证用户"。
- 单元测试覆盖边界（恰好 5 人、跨状态评价等）。

### T3.4 公司页部门 tab 【M】
- `app/company/[id]/page.tsx` + `company-review-feed.tsx`：部门 tab、五维雷达/条形图、k-匿名降级态。

**S5-S6 验收**：Top 20 种子公司每家 ≥3 个部门可选；k-匿名规则有测试；提交评价必带五维分。

---

## Sprint 7-8：违约库 + 情绪指数（M1b）

### T4.1 职业违约库 【L，法务最高危功能，按最严标准做】
- 新表 `promise_records`：`id, companyId(FK), departmentId(FK,nullable), authorUserId, anonymousProfileId, promiseText, promiseDate, outcomeText, outcomeStatus(kept/partial/broken), evidenceNote, status(复用 review 状态机), moderationReason, createdAt...`
- 发布门槛：`trustLevel >= 2`（API 层硬校验）。
- 审核：**全部人工先审后发**（不同于 review 的部分自动可见），复用 moderation 队列模式新增 `api/moderation/promise-records`。
- 证据留存：`evidenceNote` 只存描述与哈希指纹，原件不上传到本系统（PIPL + 诉讼风险最小化）；留存策略写进 SOP。
- 展示：公司页新区块"承诺 vs 兑现"，结构化对照条目，无自由长文本。

### T4.2 情绪指数（周 K 起步）【L】
- 新表 `company_sentiment_daily`：`companyId, date, score, sampleCount, components(jsonb)`。
- 每日聚合 job（先用 Vercel Cron / 路由 `api/cron/sentiment` + secret 校验）：输入 = 当日 review 五维分均值变化 + 发帖热度 + usefulCount 增量；情感分析第一版用打分代理，不接 NLP（够用、可解释、不烧钱）。
- 展示为**周 K**：公司页图表组件 + 事件标注（手工运营录入大事件：裁员/年终奖，新表 `company_events`）。
- **分享截图卡**：`api/og` 路由生成情绪指数分享图（深色系、带公司名与周K曲线）——这是 M2 传播的核心物料，质量要求等同身份卡。

### T4.3 审计日志补全 【S】
- 仿 `discussion_moderation_events`，为 verification 与 promise_records 的每次状态变更落 events 表。

**S7-S8 验收**：违约库零自由文本直出；任一公司可生成一张拿得出手的情绪指数分享图。

---

## Sprint 9-10：M2 引爆支撑

### T5.1 拍卖公益专场（运营级，非系统）【S-M】
- 一个静态专场页 `app/auction/page.tsx`：嘉宾介绍 + 报名表单（出价 + "为什么是我"）→ 表单数据进库（`auction_bids` 简表）或直接外部表单。
- 竞价撮合、选人、收款全部人肉 + 捐赠收据公示页。**不写竞价引擎**——用 10 场真实数据反哺 M3 的系统设计。

### T5.2 传播与转化打磨 【M】
- 邀请落地页（`app/invite/[code]`）：被邀请人看到邀请人身份卡 + 产品价值主张——K 因子 0.8 成败在这一页。
- 情绪指数截图卡加水印引导 + 邀请码绑定（截图带邀请入口）。

### T5.3 指标看板 【M】
- 北极星：L2+ 用户周活；反向约束：申诉成功率/删帖率；漏斗：注册→L1→L2。
- 先用 SQL + 简单 admin 页，不接 BI。

---

## 贯穿全程的规则（写给每个 Sprint）

1. **k-匿名与法务红线**：任何新展示面（API 或页面）上线前过 `lib/server/anonymity.ts`，不允许绕过。
2. **审核优先于自动可见**：违约库、身份卡敏感字段（高光时刻/拒绝陈列位）一律先审后发；普通评价维持现状态机。
3. **PIPL 最小化**：验证原件审完即删、薪资类信息 M3 前不碰、所有敏感字段在 schema review 时问一句"能不能不存"。
4. **遵守仓库规约**：写代码前先读 `node_modules/next/dist/docs/` 对应章节（本仓库 Next.js 与常识版本有 breaking changes）。

## 明确不做（防 scope creep）

- M3 前不做：拍卖竞价系统、L3 薪资验证、圈层私聊、预测市场、可视化公司、高光馆、一技封神。
- 不接 NLP 情感分析（评分代理够用）、不接 BI、不做 App（Web 优先）。
