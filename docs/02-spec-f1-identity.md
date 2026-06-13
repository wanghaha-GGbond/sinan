# 02 · F1 身份卡 + 三级验证 Spec

> 地基功能。验证越硬，正面炫耀越可信，背面匿名爆料也越可信。
> 代码现状：`company_verifications` 表与提交表单已有雏形（work_email / business_document），
> 但 L1 只是「填了邮箱」没有「验证邮箱」，且验证结果与 `users.trust_level` 无任何联动。

## 1. 验证分级

| 等级 | 凭证 | 审核方式 | trustLevel | 卡面材质 | 上线 |
|---|---|---|---|---|---|
| L1 | 企业邮箱验证码 | 全自动 | 1 | 哑光 | M0 |
| L2 | 工牌 / 在职证明 | 人工审核 | 2 | 金属 | M0 |
| L3 | 薪资流水（只验区间） | 人工 / 第三方 | 3 | 黑金 | **M3**（见 §7） |

原则：**界面永不出现 L1/L2/L3 字样，用材质暗示等级**。未验证用户（trustLevel=0）卡面为纸面纹理灰阶，功能上可浏览不可发布。

## 2. 验证申请状态机

```
submitted ──> reviewing ──> approved ──> (revoked)
    │             │
    └─────────────┴──────> rejected （可重新提交，同一公司同时只允许一笔进行中申请）
```

- 现有枚举 `company_verification_status` 需追加 `revoked`（吊销：事后发现造假 / 离职超期未更新）。
- `approved` 时**同一事务内**执行：verification 状态更新 + `users.trust_level = GREATEST(trust_level, granted)` + `companies.verified_identity_count + 1`，并写审计事件（见 08 §5）。
- `revoked` 时：重算该用户剩余有效验证的最高等级，trustLevel 回落；其历史发言的段位标签**不回溯修改**（展示当时等级，标注「已失效」）。

## 3. L1 企业邮箱——验证码闭环

### 流程

1. 用户提交申请（现有表单），`proofType = work_email`。
2. 域名校验：
   - 命中公共邮箱黑名单（gmail/qq/163…，已实现）→ 拒绝，提示改走 L2。
   - 命中 `companies.email_domains`（新增 jsonb 字段，运营维护 Top 公司域名映射）→ 自动发码。
   - 企业域名但与所选公司不匹配 → 进人工队列（可能是子公司 / 新域名），不直接拒绝。
3. 发送 6 位验证码，15 分钟有效；用户回填，命中即 `approved`（L1 无人工环节）。

### 防留痕设计（关键风控决议）

目标用户最怕「公司邮件网关里出现职场爆料社区的痕迹」：

- 发件人为**中性域名**（如 `no-reply@<与产品无关的中性域名>`），非产品主域。
- 邮件标题与正文**不出现产品名、不出现「职场 / 评价 / 社区」字样**，只有验证码和一句中性说明（「您的验证码是 ……，15 分钟内有效」）。
- 不带 logo、不带链接（链接会被网关沙箱点开，也增加识别面）。
- 注册引导页明确告知用户这一设计——防留痕本身就是卖点。

### 频控与防滥用

- 复用 `lib/server/rate-limit.ts`：同邮箱 1 分钟 1 封、1 小时 5 封；同 IP 1 小时 10 次申请。
- 单笔申请验证码最多尝试 5 次，超过作废需重新发码。
- 验证码只存哈希（`code_hash`），不存明文。

### 数据模型（新增）

```
email_verification_codes
  id, verification_id (FK company_verifications), code_hash,
  expires_at, attempt_count, consumed_at, created_at
```

### API

- `POST /api/company-verifications/[id]/send-code`
- `POST /api/company-verifications/[id]/confirm-code`

邮件服务封装在 `lib/server/mail.ts`（接 Resend / SES 任一，可替换）。

## 4. L2 在职证明——人工审核

- 凭证类型：工牌照片 / 在职证明 / 带公司名的内部系统截图（脱敏后）。
- **原件审完即删**：审核通过后系统删除上传原件，只留审核结论 + 审核人 + 时间（PIPL 最小化，见 08 §3）。schema 上 `company_verifications` 不存文件 URL 长期引用，文件存储设 7 天 TTL。
- 审核后台：仿现有 `api/moderation/review-reports` 模式——
  - `GET /api/moderation/company-verifications`（队列）
  - `PATCH /api/moderation/company-verifications/[id]`（approve / reject + rejectReason + grantedTrustLevel）
- 审核 SOP 与查验要点见 [08 §4](08-compliance-risk.md)。
- SLA：提交后 48 小时内出结论；超时在 /me 显示「审核中，预计 X 小时」。

### company_verifications 表修正（趁未上线）

- `company_id`、`applicant_user_id` 由 `text` 改 `uuid` + 外键（→ companies.id / users.id）。
- 新增：`reviewed_by_user_id`（FK users）、`reviewed_at`、`reject_reason`、`granted_trust_level`。
- 枚举 `company_verification_proof_type` 追加 `salary_proof`（M3 用，先预留值避免后续迁移）。

## 5. 身份卡

### 正面（实名光鲜履历）

- 字段：公司 + 职级带 + 年限 + 1 个高光时刻；默认折叠详情。
- `users` 表扩展：`job_band`（职级带文本）、`years_of_experience`、`highlight_moment`、`declined_offer`。
- 材质随 trustLevel：0=纸面灰阶 / 1=哑光 / 2=金属 / 3=黑金。CSS 渐变 + 纹理实现，深色系、衬线字，质感等同私人银行卡设计稿验收。
- **拒绝陈列位**：`declined_offer` 展示 1 个「婉拒的 offer」（公司 + 职级带，不含薪资数字）。

### 敏感字段审核

`highlight_moment` 与 `declined_offer` 为自由文本且具炫耀属性 → **先审后展示**（防止冒充 / 拉踩 / 写出可识别第三方的内容）。实现：字段级状态 `profile_fields_status`（pending / approved / rejected），进人工队列。

### 背面（匿名声誉）

- 展示：评价被采纳数（= 该用户全部 review 的 `useful_count` 聚合）、被感谢数、`reputation_score`。
- **不暴露任何具体内容**、不暴露所评公司——背面证明「这个人在匿名世界同样有信用」，仅此而已。
- 翻转交互：点击 / 悬停翻面。

### 挂载点

- `/me`（自己的卡，含编辑入口与验证引导）。
- 新路由 `app/u/[id]/page.tsx`（公开主页：卡 + 「由 XX 引荐」+ 圈层徽标位）。

## 6. 匿名段位标签（与 F2 联动）

- 匿名发言显示「某 L7 验证用户」式标签：取自 `job_band` + 验证状态，经 `anonymous_profiles`（已有，按 scope 分身份）渲染。
- **k-匿名约束**：所在部门样本不足时自动模糊为「某高 P 验证用户」，规则唯一入口 `lib/server/anonymity.ts`，详见 [08 §2](08-compliance-risk.md)。

## 7. L3 薪资验证（推迟 M3 的理由与预案）

- PIPL 下薪资属敏感个人信息，「只验区间不存原件」**不豁免**合规义务：需单独同意 + 个人信息保护影响评估（PIA）。
- 自营审核成本高、流水伪造识别难 → M3 优先评估第三方收入验证服务；自营兜底方案：人工查验 + 区间结论 + 原件即时删除，全程录屏审计。
- M0 仅做 schema 预留（枚举值 `salary_proof`），不做任何 UI。

## 8. 验收标准（修订版，理由见 09）

| 指标 | 目标 |
|---|---|
| 注册 → 任意等级验证转化率 | >60% |
| 注册 → L1 转化率 | >40%（v0.1 的 60% 不现实：企业邮箱收码对目标人群有心理门槛） |
| L2 渗透率（验证用户中） | >25% |
| L2 审核 SLA 达标率（48h） | >95% |
| 验证吊销率（事后发现造假） | <1%，且每例必须可追溯审核责任 |
