# 06 · 数据模型全景：现状 → 目标形态

> 事实源：`apps/web/src/db/schema/`（drizzle）。迁移：`npm run db:generate`，文件落 `src/db/migrations/`。
> 注意：text→uuid 这类列类型变更，drizzle 生成的 ALTER 缺 `USING` 子句，需手工补。

## 1. 现有 11 张表（截至 migration 0008）

| 表 | 用途 | 状态 |
|---|---|---|
| `users` | 账号；已有 `trust_level`、`reputation_score` 字段但**无写入路径** | 需扩展 |
| `anonymous_profiles` | 匿名分身，按 scope（global/company/review/discussion）隔离 | 够用 |
| `companies` | 公司库，含审核/认领状态、`verified_identity_count` | 需扩展 |
| `company_verifications` | 在职验证申请 | **需修正**（见 §2） |
| `company_corrections` | 公司信息纠错 | 够用 |
| `company_appeals` | 公司方申诉 | 够用，违约库复用 |
| `reviews` | 评价主体，含状态机/审核原因/`questionnaire` jsonb | 需扩展 |
| `review_discussions` | 评价下讨论（question/supplement） | 够用 |
| `discussion_useful_votes` | 有用票 | 够用 |
| `discussion_moderation_events` | 讨论审核审计流水 | 模式推广到全域（§4） |
| `review_reports` | 举报 | 够用 |

## 2. 存量表修正与扩展

### company_verifications（趁未上线修，最高优先）

- `company_id` text → **uuid + FK companies.id**；`applicant_user_id` text → **uuid + FK users.id**
- 新增：`reviewed_by_user_id` (uuid FK users)、`reviewed_at`、`reject_reason`、`granted_trust_level` (integer)
- 枚举 `company_verification_status` 追加 `revoked`；`company_verification_proof_type` 追加 `salary_proof`

### users 扩展（M0）

```
job_band text            -- 职级带（"P7"/"总监带"），身份卡与段位标签数据源
years_of_experience int
highlight_moment text    -- 高光时刻（先审后展示）
declined_offer text      -- 拒绝陈列位（先审后展示）
profile_fields_status jsonb  -- 敏感字段审核状态 {highlight_moment: "pending", ...}
```

### companies 扩展（M0-M1）

```
email_domains jsonb      -- L1 域名映射，运营维护（M0）
```

### reviews 扩展（M1）

```
department_id uuid FK departments (nullable)   -- 存量 department_hint 保留，逐步归一
-- questionnaire jsonb 收紧为固定五维 schema（zod 校验，见 03 §1.2），不改列只改写入约束
```

## 3. 新增表（按里程碑）

### M0

```
email_verification_codes   -- L1 验证码（02 §3）
  id, verification_id FK, code_hash, expires_at, attempt_count, consumed_at, created_at

invites                    -- 邀请制（04 §1）
  id, code unique, inviter_user_id FK, invited_user_id FK nullable,
  status(unused/used/revoked), created_at, used_at
```

### M1

```
departments                -- 部门（03 §1.1）
  id, company_id FK, name, alias_names jsonb, status, merged_into_id FK self, created_at

promise_records            -- 职业违约库（03 §2）
  id, company_id FK, department_id FK nullable, author_user_id FK, anonymous_profile_id FK,
  promise_text, promise_date, promise_context, outcome_status(kept/partial/broken),
  outcome_text, evidence_note, status, moderation_reason, created_at, reviewed_at

company_sentiment_daily    -- 情绪指数（03 §3）
  company_id FK, date, score, sample_count, components jsonb   -- PK(company_id, date)

company_events             -- K 线事件标注（03 §3.2）
  id, company_id FK, date, title, type(layoff/bonus/org_change/news/other),
  source_note, created_by_user_id FK, created_at
```

### M2

```
auction_bids（简表）        -- 运营专场报名（05 §3），或用外部表单替代
```

### M3（预案，开工前再评审）

```
auctions / auction_bids（完整版）       -- 05 §4
circles / circle_members                -- 04 §2
dm_threads / dm_messages / dm_requests  -- 04 §3
salary_verifications（或并入 company_verifications）-- L3，02 §7
```

## 4. 审计流水（贯穿）

`discussion_moderation_events` 的模式（actor_role: system/moderator/author + 动作 + 原因 + 时间）推广为通用审计：

- M0：`verification_events`（验证状态每次变更）
- M1：`promise_moderation_events`（违约库审核）
- 法务要求：任何「内容从可见变为不可见」「身份等级变更」必须可追溯到人和时间（08 §5）。

## 5. 演进原则

1. **枚举只追加不删改**：postgres enum 删值需重建类型；废弃值在应用层屏蔽。
2. **k-匿名在展示层不在存储层**：库里存全量真实数据，模糊化只发生在 `lib/server/anonymity.ts` 出口——规则可调而数据不损。
3. **外键从第一天就加**：text 伪外键的代价已在 company_verifications 上验证过。
4. **敏感原件不入库**：验证凭证、违约证据一律「审完即删 + 留指纹」，文件存储设 TTL。
5. **软删除一致性**：沿用 `deleted_at` 模式（users/reviews 已用），新表照做。
