# 司南 Backend Schema

真实 API 前置设计与实现。Phase 2 已进入 Drizzle schema 实现阶段。

## 实现状态

| 表 | 状态 | 说明 |
|---|---|---|
| `users` | Drizzle schema 已定义，migration 已生成 | `user_role` 只允许 user / moderator / admin，禁止 company / employer / hr |
| `anonymous_profiles` | Drizzle schema 已定义，migration 已生成 | scope_type = company 是 MVP 默认作用域；公开 API 不返回 user_id / fingerprint_hash |
| `companies` | Drizzle schema 已定义，migration 已生成 | 29 列，8 index，2 FK；reviewStatus 控制可评价/可搜索/可见性 |
| `company_submissions` | Phase 3 已决定：方案 A | MVP 直接用 companies 表承载提交记录，后续可引入独立提交表 |
| `reviews` | Drizzle schema 已定义，migration 已生成 | 27 列，5 partial index，3 FK；只有 reviewable 公司可创建评价；公开列表只返回 visible/limited_visible |
| `review_discussions` | Drizzle schema 已定义，migration 已生成 | 27 列，6 partial index，4 FK；公开列表只返回 visible/limited_visible；只有公开 review 可创建 discussion |
| `discussion_moderation_events` | Drizzle schema 已定义，migration 已生成 | 11 列，3 index，2 FK；记录每次状态变更的完整审计历史（who, from→to, why, snapshots）；actor_role 只允许 system/moderator/author，禁止 company/employer/hr |
| `discussion_useful_votes` | Drizzle schema 已定义，migration 已生成 | 9 列，6 index（含 3 个 partial unique），3 FK；三种去重维度（user/anonymous/fingerprint）；只允许公开 discussion 被投票 |

---

## 1. 总体实体关系

### 1.1 核心 ER 图

```
users 1 ──── N anonymous_profiles
users 1 ──── N reviews
users 1 ──── N review_discussions
users 1 ──── N discussion_useful_votes
users 1 ──── N company_submissions (可选)

anonymous_profiles 1 ──── N reviews
anonymous_profiles 1 ──── N review_discussions
anonymous_profiles 1 ──── N discussion_useful_votes

companies 1 ──── N reviews
companies 1 ──── N review_discussions
companies 1 ──── N company_submissions (可选)

reviews 1 ──── N review_discussions
review_discussions 1 ──── N discussion_moderation_events
review_discussions 1 ──── N discussion_useful_votes
```

### 1.2 实体角色说明

| 实体 | 角色 | 说明 |
|---|---|---|
| `users` | 账户实体 | 平台用户账户。不等于企业账号。 |
| `anonymous_profiles` | 匿名身份实体 | 用户在不同内容场景下的匿名展示身份。核心安全边界。 |
| `companies` | 被评价对象 | 公司只是被评价对象，不是平台客户。 |
| `reviews` | 评价内容 | 用户对公司的主评价。 |
| `review_discussions` | 社区讨论 | 评价下的追问与补充。 |
| `discussion_moderation_events` | 审核事件 | 讨论内容的审核与状态变更历史。 |
| `discussion_useful_votes` | 有用投票 | 讨论的有用投票记录。 |

### 1.3 核心约束

- `user` 是账户实体，不等于企业账号。本阶段不设计企业账号、HR 权限、公司入驻。
- `anonymous_profile` 是用户在不同场景下的匿名展示身份。`user_id` 不对外暴露。
- `company` 是被评价对象，不拥有评价管理权限。企业不能控评、删评、买排名、查看匿名身份、参与 moderation。
- `reviews.company_id` 只能引用 `companies.review_status = 'reviewable'` 的公司。
- `review_discussions.company_id` 同样只能引用 `reviewable` 公司。

---

## 2. users 表

### 2.1 用途

`users` 存储平台用户账户。用户可以是求职者、在职员工、离职员工、面试者、实习生、外包/派遣人员或普通浏览者。

**重要：`users` 不等于企业账号。本阶段不设计企业账号、HR 权限、公司入驻。**

### 2.2 字段定义

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | gen_random_uuid() | 主键 |
| `email` | `text` | NULL | — | 邮箱（可选登录方式） |
| `phone` | `text` | NULL | — | 手机号（可选登录方式） |
| `password_hash` | `text` | NULL | — | 密码哈希 |
| `display_name` | `text` | NULL | — | 展示名称（非公开） |
| `avatar_url` | `text` | NULL | — | 头像 URL（非公开） |
| `role` | `text` | NOT NULL | `'user'` | 平台角色 |
| `status` | `text` | NOT NULL | `'active'` | 账户状态 |
| `trust_level` | `integer` | NOT NULL | 0 | 信任等级（0-N，越高越可信） |
| `reputation_score` | `integer` | NOT NULL | 0 | 声誉分（发内容、获有用等累计） |
| `created_at` | `timestamptz` | NOT NULL | `now()` | 注册时间 |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | 更新时间 |
| `deleted_at` | `timestamptz` | NULL | — | 注销时间（软删除） |
| `last_login_at` | `timestamptz` | NULL | — | 最后登录时间 |

### 2.3 role 枚举

| 值 | 说明 |
|---|---|
| `user` | 普通用户 — 浏览、发布评价、发布讨论、提交公司、点有用 |
| `moderator` | 审核员 — 审核内容、打码、隐藏、拒绝（未来实现） |
| `admin` | 管理员 — 管理 moderator、系统配置 |

**明确禁止的 role 值：**

| 禁止值 | 原因 |
|---|---|
| `company` | 企业不是平台用户角色，不能混入权限体系 |
| `employer` | 雇主不是平台用户角色 |
| `hr` | HR 不是平台用户角色 |

企业如果未来需要公开回应能力，必须另起受限模型，不能使用 users 表的 role 字段赋予 moderation 权限。

### 2.4 status 枚举

| 值 | 说明 |
|---|---|
| `active` | 正常 |
| `suspended` | 暂停（违规处罚） |
| `deleted` | 已注销 |

### 2.5 唯一约束

```sql
-- 邮箱唯一（仅非空值）
CREATE UNIQUE INDEX users_email_uidx ON users (email)
  WHERE email IS NOT NULL AND deleted_at IS NULL;

-- 手机号唯一（仅非空值）
CREATE UNIQUE INDEX users_phone_uidx ON users (phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;
```

注意：邮箱和手机号都是可选的，支持匿名使用场景。用户可以先匿名使用，后续补充登录方式。

### 2.6 索引

```sql
CREATE INDEX users_status_idx ON users (status);
CREATE INDEX users_created_at_idx ON users (created_at DESC);
CREATE INDEX users_trust_level_idx ON users (trust_level DESC);
```

### 2.7 权限边界

**普通 user：**
- 浏览公开内容
- 发布评价（需要 anonymous_profile）
- 发布追问与补充（需要 anonymous_profile）
- 提交未收录公司
- 点有用 / 取消有用
- 删除自己发布的内容

**普通 user 不可：**
- 审核内容
- 隐藏/拒绝他人内容
- 查看他人 email / phone
- 查看他人 anonymous_profile → user 的映射
- 访问 moderation events

**moderator（未来）：**
- 查看审核队列
- 审核内容（visible / limited_visible / hidden / rejected）
- 打码敏感内容
- 查看审核历史

**admin（未来）：**
- 管理 moderator 任命
- 系统配置

---

## 3. anonymous_profiles 表

### 3.1 用途

`anonymous_profiles` 是司南匿名社区的核心安全基础设施。它解决一个关键矛盾：

> 用户需要匿名发布内容，但平台仍需要一定连续性和反作弊能力。

设计目标：

- 对其他用户隐藏真实身份 → 公开 API 只返回 `display_label` 和 `anonymous_profile_id`
- 对企业隐藏真实身份 → 企业永远不能获取 `user_id` 或 `fingerprint_hash`
- 对公开页面只展示匿名标签 → 如"匿名过来人"、"匿名求职者"
- 平台内部可以做反作弊和审核 → 通过 `user_id` 和 `fingerprint_hash` 关联
- 不直接暴露 `user_id` → 公开 API 永远不返回 `user_id`

### 3.2 一个用户，多个匿名身份

一个 `user` 可以拥有多个 `anonymous_profile`，按场景生成：

| scope_type | 含义 | 推荐使用 |
|---|---|---|
| `global` | 全局匿名身份 | 不推荐（跨公司可串联） |
| `company` | 公司维度匿名身份 | **MVP 推荐** |
| `review` | 评价维度匿名身份 | 每篇评价独立身份 |
| `discussion` | 讨论维度匿名身份 | 每条讨论独立身份 |

**MVP 推荐策略：每个用户在每个公司下生成一个稳定的 `anonymous_profile`（scope_type = company）。**

这样同一公司内发言有连续性（读者能看到同一个"匿名过来人"的多条发言），但不同公司之间不容易被串联。

### 3.3 字段定义

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | gen_random_uuid() | 主键，对外暴露 |
| `user_id` | `uuid` | NULL | — | 关联 users（未登录为 NULL） |
| `scope_type` | `text` | NOT NULL | — | 作用域类型 |
| `scope_id` | `uuid` | NULL | — | 作用域 ID（如 company_id） |
| `display_label` | `text` | NOT NULL | — | 公开展示的匿名标签 |
| `avatar_seed` | `text` | NULL | — | 头像种子（生成一致匿名头像） |
| `fingerprint_hash` | `text` | NULL | — | 设备指纹哈希，仅反作弊 |
| `trust_level` | `integer` | NOT NULL | 0 | 匿名身份信任等级 |
| `is_current` | `boolean` | NOT NULL | `true` | 是否当前有效 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | 创建时间 |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | 更新时间 |
| `last_used_at` | `timestamptz` | NULL | — | 最近使用时间 |
| `deleted_at` | `timestamptz` | NULL | — | 软删除时间 |

### 3.4 display_label 示例

| 场景 | display_label | 说明 |
|---|---|---|
| 求职者提问 | `匿名求职者` | 不暴露具体身份 |
| 离职员工补充 | `匿名过来人` | 不暴露姓名/职位 |
| 在职员工评价 | `在职员工` | 不暴露部门 |
| 面试者分享 | `面试者` | 不暴露面试岗位 |

**约束：**
- `display_label` 不应包含真实姓名、邮箱、手机号
- 不应包含公司内部职位
- 不应包含任何可追溯到具体个人的信息

### 3.5 唯一约束

```sql
-- 登录用户：每个 scope 下只能有一个有效匿名身份
CREATE UNIQUE INDEX anonymous_profiles_user_scope_uidx
  ON anonymous_profiles (user_id, scope_type, scope_id)
  WHERE user_id IS NOT NULL AND deleted_at IS NULL;

-- 未登录用户：每个设备指纹每个 scope 下只能有一个有效匿名身份
CREATE UNIQUE INDEX anonymous_profiles_fingerprint_scope_uidx
  ON anonymous_profiles (fingerprint_hash, scope_type, scope_id)
  WHERE fingerprint_hash IS NOT NULL AND deleted_at IS NULL;
```

### 3.6 索引

```sql
CREATE INDEX anonymous_profiles_user_idx ON anonymous_profiles (user_id);
CREATE INDEX anonymous_profiles_scope_idx ON anonymous_profiles (scope_type, scope_id);
CREATE INDEX anonymous_profiles_fingerprint_idx ON anonymous_profiles (fingerprint_hash);
```

### 3.7 与内容发布的关联

发布 review 时：
```
reviews.anonymous_profile_id = <当前公司 scope 下的 anonymous_profile.id>
reviews.author_user_id = <user.id 或 NULL>
reviews.author_fingerprint_hash = <设备指纹哈希>
```

发布 discussion 时：
```
review_discussions.anonymous_profile_id = <当前公司 scope 下的 anonymous_profile.id>
review_discussions.author_user_id = <user.id 或 NULL>
review_discussions.author_fingerprint_hash = <设备指纹哈希>
```

### 3.8 API 返回规则

**公开 API 返回（所有人可见）：**
- `anonymous_profile_id` → 用于前端关联匿名身份
- `display_label` → 如"匿名过来人"
- `avatar_seed` → 生成一致匿名头像

**公开 API 绝不返回：**
- `user_id` — 真实身份
- `fingerprint_hash` — 可追踪设备
- 任何可关联到 `users` 表的字段

**企业侧 API 永远不能获取：**
- `user_id`
- `fingerprint_hash`
- 跨公司 anonymous_profile 映射关系
- 任何能关联不同公司下同一用户的能力

---

## 4. companies 表

### 4.1 用途

`companies` 存储司南公司库。公司是被评价对象，不是平台客户。

公司来源包括：平台种子数据、用户社区提交、平台审核验证、数据导入。

### 4.2 字段定义

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | gen_random_uuid() | 主键 |
| `name` | `text` | NOT NULL | — | 展示名称 |
| `registered_name` | `text` | NULL | — | 工商注册名称 |
| `short_name` | `text` | NULL | — | 简称 |
| `english_name` | `text` | NULL | — | 英文名 |
| `aliases` | `text[]` | NULL | — | 别名 / 曾用名 |
| `unified_social_credit_code` | `text` | NULL | — | 统一社会信用代码（18位） |
| `registered_address` | `text` | NULL | — | 注册地址 |
| `legal_representative` | `text` | NULL | — | 法定代表人 |
| `business_status` | `text` | NULL | — | 经营状态 |
| `founded_date` | `date` | NULL | — | 成立日期 |
| `city` | `text` | NOT NULL | — | 所在城市 |
| `industry` | `text` | NOT NULL | — | 所属行业 |
| `size` | `text` | NULL | — | 规模（如"500-1000人"） |
| `financing_stage` | `text` | NULL | — | 融资阶段 |
| `website` | `text` | NULL | — | 官网 |
| `logo_url` | `text` | NULL | — | Logo URL |
| `description` | `text` | NULL | — | 公司简介 |
| `source` | `text` | NOT NULL | `'user_added'` | 数据来源 |
| `review_status` | `text` | NOT NULL | `'pending_review'` | 公司可评价状态 |
| `claimed_status` | `text` | NOT NULL | `'unclaimed'` | 认领状态（预留） |
| `submitted_by_user_id` | `uuid` | NULL | — | 提交者用户 ID |
| `submitted_by_anonymous_profile_id` | `uuid` | NULL | — | 提交者匿名身份 ID |
| `verified_at` | `timestamptz` | NULL | — | 审核通过时间 |
| `rejected_at` | `timestamptz` | NULL | — | 拒绝时间 |
| `rejection_reason` | `text` | NULL | — | 拒绝原因 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | 创建时间 |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | 更新时间 |
| `deleted_at` | `timestamptz` | NULL | — | 软删除时间 |

### 4.3 review_status 枚举 — 公司可评价状态机

| 值 | 含义 | 公开搜索 | 公司页 | 可评价 | 可创建 discussion |
|---|---|---|---|---|---|
| `pending_review` | 待审核 | 否（仅提交者可见） | 待审核状态页（无评论流） | 否 | 否 |
| `reviewable` | 可评价 | 是 | 完整公司页 | 是 | 是 |
| `rejected` | 不通过 | 否（仅提交者可见） | 拒绝状态提示 | 否 | 否 |

**关键约束：**
- `reviews.company_id` 只能引用 `review_status = 'reviewable'` 的公司
- `review_discussions.company_id` 同样只能引用 `reviewable` 公司
- `pending_review` 公司不允许创建 review 或 discussion（草稿可本地保存，但不能正式提交）

### 4.4 claimed_status 枚举

| 值 | 说明 |
|---|---|
| `unclaimed` | 未被企业认领（默认） |
| `claimed` | 已被企业认领（预留，当前不实现） |

**注意：本阶段 `claimed_status` 只保留字段。不实现企业认领、企业入驻或企业权限。`claimed` 状态不赋予企业任何审核、删除或控评能力。**

### 4.5 source 枚举

| 值 | 说明 |
|---|---|
| `platform_seed` | 平台种子数据 |
| `user_added` | 用户社区提交 |
| `platform_verified` | 平台审核验证 |
| `import` | 数据导入 |

### 4.6 唯一约束

```sql
-- 统一社会信用代码唯一
CREATE UNIQUE INDEX companies_credit_code_uidx
  ON companies (unified_social_credit_code)
  WHERE unified_social_credit_code IS NOT NULL AND review_status != 'rejected';

-- 注册名称唯一（允许 rejected 公司重名再提交）
CREATE UNIQUE INDEX companies_registered_name_uidx
  ON companies (registered_name)
  WHERE registered_name IS NOT NULL AND review_status != 'rejected';
```

### 4.7 索引

```sql
-- 审核队列
CREATE INDEX companies_review_status_idx
  ON companies (review_status, created_at DESC);

-- 城市 + 行业筛选
CREATE INDEX companies_city_industry_idx
  ON companies (city, industry)
  WHERE review_status = 'reviewable';

-- 名称搜索
CREATE INDEX companies_name_idx ON companies (name)
  WHERE review_status = 'reviewable';

-- 注册名称搜索
CREATE INDEX companies_registered_name_idx ON companies (registered_name);

-- 提交者查询
CREATE INDEX companies_submitted_by_idx
  ON companies (submitted_by_user_id, created_at DESC);
```

如果 PostgreSQL 启用 pg_trgm 扩展（推荐用于中文模糊搜索）：

```sql
CREATE INDEX companies_name_trgm_idx ON companies USING gin (name gin_trgm_ops);
CREATE INDEX companies_registered_name_trgm_idx ON companies USING gin (registered_name gin_trgm_ops);
```

### 4.8 公司页访问可见性规则

| review_status | 访问者 | 返回内容 |
|---|---|---|
| `reviewable` | 所有人 | 完整公司页（方向分、体感标签、评论流、评价按钮） |
| `pending_review` | 提交者本人 | 待审核状态页（不展示方向分、体感标签、评论流、评价按钮） |
| `pending_review` | 其他人 | 404 或"公司审核中"提示 |
| `rejected` | 提交者本人 | 拒绝状态提示（含 rejection_reason） |
| `rejected` | 其他人 | 404 |

### 4.9 公司提交者身份保护

- `submitted_by_user_id` 和 `submitted_by_anonymous_profile_id` 不对外公开
- 企业不能查看是谁提交了公司
- 企业不能通过公司信息反查评价者
- 公开 API 只返回公司基础信息，不返回任何提交者字段

---

## 5. company_submissions 表（方案讨论）

### 5.1 两种方案

**方案 A：直接用 `companies` 表承载提交记录（MVP 推荐）**

优点：简单，一张表覆盖公司库和提交审核。缺点：审核历史不完整，重复提交合并较麻烦，不适合复杂审核流程。

**方案 B：新增独立的 `company_submissions` 表（后续推荐）**

优点：审核历史完整，支持重复提交追踪，支持疑似重复公司标记，审核流程更规范。

### 5.2 方案 B 字段草案

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `uuid` | NOT NULL | 主键 |
| `submitted_by_user_id` | `uuid` | NULL | 提交者 |
| `submitted_by_anonymous_profile_id` | `uuid` | NULL | 提交者匿名身份 |
| `company_id` | `uuid` | NULL | 审核通过后关联的 company |
| `registered_name` | `text` | NOT NULL | 注册名称 |
| `unified_social_credit_code` | `text` | NOT NULL | 信用代码 |
| `registered_address` | `text` | NOT NULL | 注册地址 |
| `legal_representative` | `text` | NOT NULL | 法定代表人 |
| `city` | `text` | NOT NULL | 城市 |
| `industry` | `text` | NOT NULL | 行业 |
| `short_name` | `text` | NULL | 简称 |
| `size` | `text` | NULL | 规模 |
| `website` | `text` | NULL | 官网 |
| `financing_stage` | `text` | NULL | 融资阶段 |
| `business_status` | `text` | NULL | 经营状态 |
| `founded_date` | `date` | NULL | 成立日期 |
| `note` | `text` | NULL | 提交备注 |
| `status` | `text` | NOT NULL | 审核状态 |
| `moderation_reason` | `text` | NULL | 审核原因 |
| `similar_company_ids` | `uuid[]` | NULL | 疑似重复的公司 ID 列表 |
| `created_at` | `timestamptz` | NOT NULL | 提交时间 |
| `reviewed_at` | `timestamptz` | NULL | 审核时间 |
| `reviewed_by_user_id` | `uuid` | NULL | 审核员 |

### 5.3 结论

- **MVP 先用方案 A**（companies 表直接承载），简单快速
- **后续真实审核建议引入方案 B**（company_submissions 表），审核流程更规范

---

## 6. reviews 表

### 6.1 用途

存储公司评价主内容，包括方向分、标题、正文、作者角色、匿名身份、公司关联、问卷结构化数据、状态、有用数、审核状态。

### 6.2 字段定义

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | gen_random_uuid() | 主键 |
| `company_id` | `uuid` | NOT NULL | — | 关联 companies，仅限 reviewable 公司 |
| `author_user_id` | `uuid` | NULL | — | 登录用户 ID，不对外暴露 |
| `anonymous_profile_id` | `uuid` | NULL | — | 匿名身份 ID，对外暴露 |
| `author_fingerprint_hash` | `text` | NULL | — | 设备指纹哈希，仅用于反作弊 |
| `author_role` | `text` | NOT NULL | — | 作者角色枚举 |
| `author_label` | `text` | NOT NULL | — | 展示用身份标签 |
| `title` | `text` | NOT NULL | — | 评价标题 |
| `content` | `text` | NOT NULL | — | 评价正文 |
| `summary` | `text` | NULL | — | AI/编辑摘要 |
| `direction_score` | `numeric(3,1)` | NOT NULL | — | 方向分 (0.0–10.0) |
| `recommend_to_join` | `boolean` | NULL | — | 是否推荐入职 |
| `employment_status` | `text` | NULL | — | 在职状态 |
| `job_title` | `text` | NULL | — | 岗位名称 |
| `city` | `text` | NULL | — | 工作城市 |
| `department_hint` | `text` | NULL | — | 部门提示（模糊化） |
| `questionnaire` | `jsonb` | NULL | — | 结构化问卷数据 |
| `office_experience_score` | `numeric(3,1)` | NULL | — | 办公体验指数 |
| `useful_count` | `integer` | NOT NULL | 0 | 有用总数 |
| `discussion_count` | `integer` | NOT NULL | 0 | 追问/补充数 |
| `status` | `text` | NOT NULL | `'pending_review'` | 审核状态 |
| `moderation_reason` | `text` | NULL | — | 审核原因 |
| `masked_content` | `text` | NULL | — | 打码后内容 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | 创建时间 |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | 更新时间 |
| `reviewed_at` | `timestamptz` | NULL | — | 审核时间 |
| `deleted_at` | `timestamptz` | NULL | — | 软删除时间 |

### 6.3 status 枚举

| 值 | 含义 | 公开可见 | 作者可见 | moderator 可见 |
|---|---|---|---|---|
| `draft` | 本地草稿，未提交 | 否 | 是 | 否 |
| `pending_review` | 待审核 | 否 | 是 | 是 |
| `visible` | 审核通过，公开可见 | 是 | 是 | 是 |
| `limited_visible` | 部分可见（敏感信息已打码） | 是（打码版） | 是（原文） | 是（原文） |
| `hidden` | 平台隐藏 | 否 | 是（仅状态） | 是 |
| `rejected` | 审核不通过 | 否 | 是（仅状态） | 是 |
| `deleted_by_author` | 作者删除 | 否 | 是（仅状态） | 是 |

### 6.4 author_role 枚举

| 值 | 展示文本 | 说明 |
|---|---|---|
| `job_seeker` | 求职者 | 正在找工作 |
| `current_employee` | 在职员工 | 目前在职 |
| `former_employee` | 离职员工 | 已离职 |
| `interviewee` | 面试者 | 参加过面试 |
| `intern` | 实习生 | 实习经历 |
| `contractor` | 外包 / 派遣 | 外包或派遣 |
| `anonymous` | 匿名用户 | 未选择角色 |

### 6.5 moderation_reason 枚举

| 值 | 说明 |
|---|---|
| `sensitive_info` | 包含敏感信息（手机号、邮箱、身份证等） |
| `personal_attack` | 人身攻击 |
| `privacy` | 涉及他人隐私 |
| `spam` | 垃圾内容 |
| `off_topic` | 与评价无关 |
| `duplicate` | 重复内容 |
| `author_deleted` | 作者主动删除 |
| `none` | 无审核问题 |

### 6.6 索引

```sql
-- 公司维度公开评价列表（最常用查询）
CREATE INDEX reviews_company_visible_idx
  ON reviews (company_id, status, created_at DESC)
  WHERE status IN ('visible', 'limited_visible');

-- 公司维度高赞排序
CREATE INDEX reviews_company_useful_idx
  ON reviews (company_id, useful_count DESC)
  WHERE status IN ('visible', 'limited_visible');

-- 作者自己的评价列表
CREATE INDEX reviews_author_idx
  ON reviews (author_user_id, created_at DESC);

-- 审核队列
CREATE INDEX reviews_status_idx
  ON reviews (status, created_at DESC);
```

### 6.7 与前端类型对应

数据库 `reviews` 行映射到前端 `Review` 类型（`src/lib/types.ts`）：

| DB 字段 | 前端 Review 字段 | 备注 |
|---|---|---|
| `id` | `id` | — |
| `company_id` | `companyId` | — |
| `author_role` | `relation` | 枚举值到展示文本的映射 |
| `author_label` | `role` | — |
| `title` | `title` | — |
| `content` | `content` | — |
| `direction_score` | `score` | numeric → number |
| `employment_status` | `employmentStatus` | — |
| `job_title` | `jobCategory` | 语义接近 |
| `city` | `city` | — |
| `questionnaire` | `questionnaire` | jsonb → ReviewQuestionnaire |
| `useful_count` | `helpful` | — |
| `discussion_count` | `commentCount` | — |
| `created_at` | `createdAt` | timestamptz → ISO string |

---

## 7. review_discussions 表

### 7.1 用途

存储某条 review 下的追问与补充。这是司南社区化的核心内容表。

### 7.2 字段定义

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | gen_random_uuid() | 主键 |
| `review_id` | `uuid` | NOT NULL | — | 关联 reviews |
| `company_id` | `uuid` | NOT NULL | — | 冗余，加速公司维度查询 |
| `author_user_id` | `uuid` | NULL | — | 登录用户 ID |
| `anonymous_profile_id` | `uuid` | NULL | — | 匿名身份 ID |
| `author_fingerprint_hash` | `text` | NULL | — | 设备指纹哈希，仅反作弊 |
| `type` | `text` | NOT NULL | — | `question` 或 `supplement` |
| `author_role` | `text` | NOT NULL | — | 同 reviews.author_role |
| `author_label` | `text` | NOT NULL | — | 展示用身份标签 |
| `content` | `text` | NOT NULL | — | 正文 |
| `masked_content` | `text` | NULL | — | 打码后内容 |
| `status` | `text` | NOT NULL | `'pending_review'` | 审核状态 |
| `moderation_reason` | `text` | NULL | — | 审核原因 |
| `useful_count` | `integer` | NOT NULL | 0 | 有用数 |
| `reply_count` | `integer` | NOT NULL | 0 | 回复数（预留嵌套） |
| `tags` | `text[]` | NULL | — | 用户标签 |
| `source` | `text` | NOT NULL | `'api'` | 来源 |
| `created_by_current_user` | `boolean` | NULL | — | 运行时计算，不持久化 |
| `pending_sync` | `boolean` | NOT NULL | `false` | 是否待同步到服务端 |
| `visible_to_author` | `boolean` | NOT NULL | `true` | 作者是否可见 |
| `visible_to_public` | `boolean` | NOT NULL | `false` | 是否公开可见 |
| `participates_in_ranking` | `boolean` | NOT NULL | `false` | 是否参与公开排序 |
| `score` | `numeric` | NULL | — | 缓存排序分 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | 创建时间 |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | 更新时间 |
| `reviewed_at` | `timestamptz` | NULL | — | 审核时间 |
| `deleted_at` | `timestamptz` | NULL | — | 软删除时间 |

### 7.3 type 枚举

| 值 | 含义 |
|---|---|
| `question` | 追问 — 求职者对评价内容的提问 |
| `supplement` | 补充 — 过来人对评价的补充说明 |

### 7.4 status 枚举与可见性规则

服务端状态集合（注意 `local_pending` 不在其中）：

| 值 | 持久化 | visible_to_public | participates_in_ranking | 公开 content | 公开 masked_content |
|---|---|---|---|---|---|
| `draft` | 可选 | false | false | — | — |
| `pending_review` | 是 | false | false | — | — |
| `visible` | 是 | true | true | 原文 | — |
| `limited_visible` | 是 | true | true | — | 打码版 |
| `hidden` | 是 | false | false | — | — |
| `rejected` | 是 | false | false | — | — |
| `deleted_by_author` | 是 | false | false | — | — |

**重要：`local_pending` 只存在于前端。** 它是前端本地状态，表示"用户已本地保存但服务端尚未确认"。服务端收到 POST 后应返回 `pending_review` / `visible` / `limited_visible` 之一，不会持久化 `local_pending`。

### 7.5 source 枚举

| 值 | 说明 | 服务端是否持久化 |
|---|---|---|
| `api` | 通过 API 提交 | 是 |
| `import` | 数据迁移导入 | 是 |
| `mock` | 前端 mock 数据 | 否 |
| `local` | 前端本地创建 | 否 |

服务端只应持久化 `api` 和 `import` 来源。

### 7.6 可见性生成规则

服务端在写入/更新 discussion 时，应根据 status 自动设置可见性标记：

```
status = visible          → visible_to_public = true,  participates_in_ranking = true
status = limited_visible  → visible_to_public = true,  participates_in_ranking = true
status = 其他             → visible_to_public = false, participates_in_ranking = false
```

`created_by_current_user` 是运行时字段，由 API 层根据请求用户身份计算，不持久化。

### 7.7 索引

```sql
-- 单条评价下的公开讨论列表（最常用）
CREATE INDEX review_discussions_review_public_idx
  ON review_discussions (review_id, status, created_at DESC)
  WHERE status IN ('visible', 'limited_visible');

-- 单条评价下的高赞排序
CREATE INDEX review_discussions_review_useful_idx
  ON review_discussions (review_id, useful_count DESC)
  WHERE status IN ('visible', 'limited_visible');

-- 公司维度讨论列表
CREATE INDEX review_discussions_company_idx
  ON review_discussions (company_id, created_at DESC);

-- 作者自己的讨论列表
CREATE INDEX review_discussions_author_idx
  ON review_discussions (author_user_id, created_at DESC);

-- 审核队列
CREATE INDEX review_discussions_status_idx
  ON review_discussions (status, created_at DESC);
```

### 7.8 排序字段 (score)

`score` 用于缓存高赞排序分值，计算逻辑见 `src/lib/review-discussion-sort.ts`：

```
score = useful_count * 3
      + supplement_bonus (supplement +8, question 0)
      + author_role_bonus (current/former_employee +6, interviewee +3, intern/contractor +2, anonymous +1, job_seeker 0)
      + freshness_bonus (7天内 +5, 30天内 +2, 超过30天 0)
      + limited_visible_penalty (-5)
      + non_public_penalty (-1000)
```

MVP 阶段可实时计算。数据量大后可缓存 `score` 并随 `useful_count` 或 status 变化时更新。

### 7.9 与前端类型对应

数据库 `review_discussions` 行映射到前端 `ReviewDiscussionItem`（`src/lib/types.ts`）：

| DB 字段 | 前端字段 | 备注 |
|---|---|---|
| `id` | `id` | — |
| `review_id` | `reviewId` | — |
| `company_id` | `companyId` | — |
| `type` | `type` | `question` / `supplement` |
| `author_role` | `authorRole` | 枚举值一致 |
| `author_label` | `authorLabel` | — |
| `content` | `content` | — |
| `masked_content` | `maskedContent` | — |
| `status` | `status` | 枚举值一致 |
| `moderation_reason` | `moderationReason` | — |
| `useful_count` | `usefulCount` | — |
| `reply_count` | `replyCount` | — |
| `tags` | `tags` | — |
| `source` | `source` | `api` / `import`（服务端） |
| `created_by_current_user` | `createdByCurrentUser` | 运行时计算 |
| `pending_sync` | `pendingSync` | — |
| `visible_to_author` | `visibleToAuthor` | — |
| `visible_to_public` | `visibleToPublic` | — |
| `participates_in_ranking` | `participatesInRanking` | — |
| `score` | `score` | 实时计算或缓存 |
| `created_at` | `createdAt` | timestamptz → ISO string |
| `updated_at` | `updatedAt` | — |
| `reviewed_at` | `reviewedAt` | — |

---

## 8. discussion_moderation_events 表

### 8.1 用途

记录每条 `review_discussion` 的审核与状态变更历史。必须支持完整追溯：谁审核、从什么状态到什何状态、为什么变更、是否打码、备注。

企业不能写入此表。

### 8.2 字段定义

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | gen_random_uuid() | 主键 |
| `discussion_id` | `uuid` | NOT NULL | — | 关联 review_discussions |
| `actor_user_id` | `uuid` | NULL | — | 操作者用户 ID |
| `actor_role` | `text` | NOT NULL | — | 操作者角色 |
| `from_status` | `text` | NULL | — | 变更前状态（首次为 NULL） |
| `to_status` | `text` | NOT NULL | — | 变更后状态 |
| `reason` | `text` | NULL | — | 变更原因 |
| `note` | `text` | NULL | — | 审核备注 |
| `raw_content_snapshot` | `text` | NULL | — | 变更前原文快照 |
| `masked_content_snapshot` | `text` | NULL | — | 变更后打码内容快照 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | 事件时间 |

### 8.3 actor_role 枚举

| 值 | 说明 |
|---|---|
| `system` | 系统自动操作（如自动打码） |
| `moderator` | 人工审核员 |
| `author` | 内容作者（如自行删除） |

**禁止的角色：**

| 值 | 原因 |
|---|---|
| `company` | 企业不能参与 moderation |
| `employer` | 雇主不能参与 moderation |
| `hr` | HR 不能参与 moderation |

### 8.4 reason 枚举

| 值 | 说明 |
|---|---|
| `sensitive_info` | 包含敏感信息 |
| `personal_attack` | 人身攻击 |
| `privacy` | 涉及隐私 |
| `spam` | 垃圾内容 |
| `off_topic` | 偏离主题 |
| `duplicate` | 重复内容 |
| `author_deleted` | 作者主动删除 |
| `system_auto_mask` | 系统自动打码 |
| `manual_review` | 人工审核 |
| `none` | 无特殊原因 |

### 8.5 典型事件流

```
# 作者发布
from_status = NULL
to_status   = pending_review
actor_role  = author
reason      = none

# 系统自动打码（检测到敏感信息但内容有价值）
from_status = pending_review
to_status   = limited_visible
actor_role  = system
reason      = system_auto_mask

# 审核通过
from_status = pending_review
to_status   = visible
actor_role  = moderator
reason      = manual_review

# 审核拒绝
from_status = pending_review
to_status   = rejected
actor_role  = moderator
reason      = spam / off_topic / personal_attack / ...

# 作者删除
from_status = visible (或其他公开状态)
to_status   = deleted_by_author
actor_role  = author
reason      = author_deleted

# 平台隐藏
from_status = visible
to_status   = hidden
actor_role  = moderator
reason      = privacy / personal_attack / ...
```

### 8.6 索引

```sql
-- 按讨论查询审核历史（最常用）
CREATE INDEX moderation_events_discussion_idx
  ON discussion_moderation_events (discussion_id, created_at DESC);

-- 按审核员查询
CREATE INDEX moderation_events_actor_idx
  ON discussion_moderation_events (actor_user_id, created_at DESC);

-- 按目标状态查询（审核队列）
CREATE INDEX moderation_events_to_status_idx
  ON discussion_moderation_events (to_status, created_at DESC);
```

---

## 9. discussion_useful_votes 表

### 9.1 用途

记录用户对追问与补充的"有用"投票。必须防止重复投票，支持取消投票（软删除）。

### 9.2 字段定义

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | gen_random_uuid() | 主键 |
| `discussion_id` | `uuid` | NOT NULL | — | 关联 review_discussions |
| `user_id` | `uuid` | NULL | — | 登录用户 ID |
| `anonymous_profile_id` | `uuid` | NULL | — | 匿名身份 ID |
| `voter_fingerprint_hash` | `text` | NULL | — | 投票者设备指纹哈希 |
| `useful` | `boolean` | NOT NULL | `true` | 是否标记为有用 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | 投票时间 |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | 更新时间 |
| `deleted_at` | `timestamptz` | NULL | — | 取消投票时间（软删除） |

### 9.3 唯一约束

根据用户身份类型选择对应的唯一约束：

```sql
-- 登录用户：每人每讨论只能投一次
CREATE UNIQUE INDEX useful_votes_discussion_user_uidx
  ON discussion_useful_votes (discussion_id, user_id)
  WHERE user_id IS NOT NULL AND deleted_at IS NULL;

-- 匿名身份：每个匿名身份每讨论只能投一次
CREATE UNIQUE INDEX useful_votes_discussion_anon_uidx
  ON discussion_useful_votes (discussion_id, anonymous_profile_id)
  WHERE anonymous_profile_id IS NOT NULL AND deleted_at IS NULL;

-- 设备指纹：每个设备每讨论只能投一次（最低保障）
CREATE UNIQUE INDEX useful_votes_discussion_fingerprint_uidx
  ON discussion_useful_votes (discussion_id, voter_fingerprint_hash)
  WHERE voter_fingerprint_hash IS NOT NULL AND deleted_at IS NULL;
```

### 9.4 计数更新规则

- 新增 vote（`useful = true`, `deleted_at IS NULL`）→ `review_discussions.useful_count + 1`
- 取消 vote（设置 `deleted_at = now()`）→ `review_discussions.useful_count - 1`
- 保留 vote 记录不物理删除，方便反作弊和审计

### 9.5 投票权限规则

只有公开内容可以被点有用：

- `discussion.status IN ('visible', 'limited_visible')` → 允许投票
- `discussion.status IN ('draft', 'local_pending', 'pending_review', 'hidden', 'rejected', 'deleted_by_author')` → 禁止投票

API 层需要在执行投票前校验 discussion 的 status。

### 9.6 索引

```sql
-- 查询用户对某讨论的投票状态
CREATE INDEX useful_votes_discussion_user_idx
  ON discussion_useful_votes (discussion_id, user_id)
  WHERE deleted_at IS NULL;

-- 查询用户的所有投票
CREATE INDEX useful_votes_user_idx
  ON discussion_useful_votes (user_id, created_at DESC);
```

---

## 10. 权限边界总表

### 10.1 角色定义

| 角色 | 说明 |
|---|---|
| `anonymous` | 未登录用户 |
| `regular_user` | 已登录普通用户 |
| `author` | 内容作者（特定 discussion 或 review 的创建者） |
| `moderator` | 平台审核员（未来实现） |
| `company` / `employer` / `HR` | 企业代表（明确禁用 moderation 权限） |

### 10.2 权限矩阵 — review_discussions

| 操作 | anonymous | regular_user | author | moderator | company |
|---|---|---|---|---|---|
| 读取 visible / limited_visible | 是 | 是 | 是 | 是 | 是 |
| 读取自己的 pending / rejected / hidden | — | — | 是 | 是 | — |
| 读取他人的 pending / rejected / hidden | 否 | 否 | 否 | 是 | 否 |
| 发布 discussion | 是（限速） | 是 | 是 | 是 | 否 |
| 点有用 | 是（去重） | 是 | 是 | 是 | 否 |
| 取消有用 | 自己投的 | 自己投的 | 自己投的 | 自己投的 | 自己投的 |
| 删除自己的 discussion | — | — | 是 | — | 否 |
| 审核（变更 status） | 否 | 否 | 否 | 是 | **否** |
| 查看 raw sensitive content | 否 | 否 | 否 | 是 | **否** |
| 查看作者真实身份 | 否 | 否 | 否 | 是（受限） | **否** |
| 查看 moderation event 历史 | 否 | 否 | 否 | 是 | **否** |

### 10.3 企业权限限制（必须硬编码执行）

企业 / 雇主 / HR **不能**：

1. 控评 — 不能修改、隐藏、删除任何 review 或 discussion
2. 删评 — 不能通过任何机制删除负面内容
3. 买排名 — 不能影响公司排序
4. 查看匿名身份 — 不能获取 author_user_id / anonymous_profile_id / author_fingerprint_hash
5. 参与 moderation — 不能成为 moderation actor
6. 通过申诉直接隐藏内容 — 企业反馈必须是公开回应，而非审核权
7. 私信作者 — 不能通过平台联系匿名评价者

---

## 11. API 映射总表

### 11.1 内容社区 API

| API 端点 | 读取表 | 写入表 | 关键规则 |
|---|---|---|---|
| `GET /api/reviews/:reviewId/discussions` | `review_discussions`, `discussion_useful_votes` | — | `publicDiscussions` = status IN (visible, limited_visible); `myDiscussions` = 当前用户创建的 pending/hidden/rejected/deleted |
| `POST /api/reviews/:reviewId/discussions` | `review_discussions` (校验 company 状态) | `review_discussions`, `discussion_moderation_events` | company 必须 reviewable; 默认 status = pending_review; 自动打码则 limited_visible |
| `POST /api/review-discussions/:discussionId/useful` | `review_discussions` | `discussion_useful_votes` | 仅 status IN (visible, limited_visible); upsert vote; 更新 useful_count |
| `DELETE /api/review-discussions/:discussionId` | — | `review_discussions` (update), `discussion_moderation_events` | 仅作者本人; status → deleted_by_author |
| `PATCH /api/moderation/review-discussions/:discussionId` | — | `review_discussions` (update), `discussion_moderation_events` | 仅 moderator; 企业禁止 |

### 11.2 公司库与提交 API

| API 端点 | 读取表 | 写入表 | 关键规则 |
|---|---|---|---|
| `GET /api/companies/search` | `companies` | — | 默认只返回 `review_status = reviewable`; 可选返回当前用户的 `pending_review` 提交 |
| `GET /api/companies/:companyId` | `companies` | — | `reviewable` → 完整公司页; `pending_review` → 仅提交者可见待审核状态; `rejected` → 仅提交者可见拒绝原因 |
| `POST /api/companies/community-submissions` | `companies` (查重) | `companies` | 默认 `review_status=pending_review`, `source=user_added`, `claimed_status=unclaimed`; 提交者身份不公开 |
| `GET /api/me/company-submissions` | `companies` | — | 返回当前用户提交的 pending_review / reviewable / rejected 公司 |

---

## 12. 安全与隐私原则

1. **匿名评价者身份不能被企业获取** — `author_user_id`、`anonymous_profile_id`、`author_fingerprint_hash` 对企业侧 API 完全不可见
2. **author_fingerprint_hash 只能用于反作弊** — 不可用于公开展示、不可用于识别用户真实身份、不可与第三方共享
3. **moderation events 只对未来 moderator 可见** — 普通用户和企业不可见审核历史
4. **limited_visible 必须展示 maskedContent** — 对外 API 返回 `masked_content` 而非原始 `content`
5. **对外 API 不返回 raw sensitive content** — 敏感信息在 API 层过滤
6. **企业不能通过申诉直接隐藏内容** — 企业反馈如果未来存在，必须作为公开回应而不是审核权
7. **不建议只依赖 IP 去重** — 匿名投票需要结合 `anonymous_profile_id` 或 fingerprint hash
8. **软删除保留审计线索** — vote 和 discussion 的删除使用 `deleted_at` 标记，不做物理删除

---

## 13. 状态流转图

### 13.1 Discussion 状态流转

```
                    ┌─────────┐
                    │  draft  │ (前端本地，可选不持久化)
                    └────┬────┘
                         │ 作者提交
                         ▼
                ┌───────────────┐
                │ pending_review │ (服务端默认初始状态)
                └───────┬───────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
   ┌──────────┐ ┌──────────────┐ ┌──────────┐
   │ visible  │ │limited_visible│ │ rejected │
   └────┬─────┘ └──────┬───────┘ └──────────┘
        │              │
        │              │  moderator /
        │              │  system 重新审核
        │              │
   ┌────┼──────────────┼──────────┐
   │    │              │          │
   ▼    ▼              ▼          ▼
┌──────┐ ┌─────────────────────┐ ┌──────────────────┐
│hidden│ │deleted_by_author    │ │ 回到 visible /    │
│      │ │(仅作者可触发)       │ │ limited_visible   │
└──────┘ └─────────────────────┘ └──────────────────┘
```

### 13.2 关键约束

- `deleted_by_author` 是终态，不可逆（作者删除后不能恢复）
- `rejected` → `pending_review` 可以重新提交（作者修改后）
- `hidden` → `visible` 可以恢复（moderator 复审）
- 企业不能触发任何状态变更

### 13.3 Company review_status 状态流转

```
                    用户提交
                        │
                        ▼
                ┌───────────────┐
                │ pending_review │ (默认初始状态)
                └───────┬───────┘
                        │
              ┌─────────┴─────────┐
              │                   │
              ▼                   ▼
       ┌────────────┐      ┌──────────┐
       │ reviewable │      │ rejected │
       └────────────┘      └──────────┘
              │                   │
              │                   │ (重新提交)
              │                   ▼
              │            pending_review
              │
       可评价、可搜索、可展示公司页
```

### 13.4 关键约束

- `pending_review` 公司不可评价、不进入公开搜索、不展示完整公司页
- `reviewable` 公司才可创建 reviews 和 discussions
- `rejected` 公司仅提交者可见拒绝状态，可重新提交
- 企业不能影响 review_status 变更
- 公司提交者身份（`submitted_by_user_id`、`submitted_by_anonymous_profile_id`）不公开

---

## 14. 当前未覆盖但已预留

| 项目 | 状态 | 说明 |
|---|---|---|
| 登录 / 注册系统 | 未实现 | `users` 表已设计，`email`/`phone`/`password_hash` 已预留 |
| 匿名身份生成逻辑 | 未实现 | `anonymous_profiles` 表已设计，`scope_type=company` MVP 策略已定义 |
| `reviews` 的 moderation_events | 未单独建表 | 当前 MVP 可用 reviews 自身的 status + moderation_reason 覆盖；后续可拆出 `review_moderation_events` |
| `company_submissions` 表 | 方案 B 已设计 | MVP 用方案 A（companies 直接承载），后续建议引入独立提交表 |
| 企业公开回应 | 未设计 | 企业可在 discussion 下以公开身份回应（非审核权） |
| 通知系统 | 未设计 | discussion 被回复、status 变更等通知 |
| 举报系统 | 未设计 | 用户举报 → moderator 审核的闭环 |
| 反作弊与限速 | 未设计 | fingerprint_hash 已预留，具体策略待定 |
