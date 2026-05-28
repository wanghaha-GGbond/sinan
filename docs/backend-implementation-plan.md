# 司南后端实施计划

## 当前阶段

Phase 1：Drizzle ORM + Neon PostgreSQL 基础设施接入。

本阶段只建立数据库连接、配置和目录结构，不创建业务表，不实现 API，不改变前端业务逻辑。

## 技术选型

| 决策 | 选择 | 备选 |
|---|---|---|
| 数据库 | PostgreSQL | — |
| 托管推荐 | Neon Postgres | Supabase |
| ORM | Drizzle ORM | Prisma |

## 为什么选择 Drizzle

- 对 PostgreSQL partial index 支持完整（司南 schema 大量使用条件唯一索引和条件查询索引）
- 对 enum 和状态机支持更好（pgEnum 提供数据库级约束）
- 对 JSONB 支持更自然（questionnaire 等结构化数据）
- TypeScript 原生 schema 定义，不需要额外 DSL
- 便于后续对 moderation / useful vote / anonymous profile 做精细约束

## 为什么 Neon 作为主推

- 纯 PostgreSQL，无平台绑定，迁移成本最低
- 数据库分支（branching）功能适合开发/预览环境验证 migration
- 免费额度 0.5GB 对 MVP 足够
- Serverless 友好，支持 HTTP 驱动连接

## 分阶段计划

### Phase 1：基础设施（已完成）

- [x] 安装 Drizzle ORM + Drizzle Kit + Neon driver
- [x] 配置 drizzle.config.ts
- [x] 建立 src/db/client.ts
- [x] 建立 src/db/schema/ 和 src/db/migrations/ 目录
- [x] 新增 .env.example
- [x] 新增 package.json db scripts
- [x] 验证 lint / build / e2e 全通过

### Phase 2：users + anonymous_profiles（已完成）

- [x] 定义 users 表 Drizzle schema（含 partial unique index）
- [x] 定义 anonymous_profiles 表 Drizzle schema（含 partial unique index + FK）
- [x] 定义 user_role / user_status / anonymous_scope_type 枚举
- [x] 生成 migration
- [x] 建立匿名身份服务端工具函数（src/lib/server/anonymous-profile.ts）
- [x] 不做完整登录系统
- [x] 不做 API routes
- [x] 不改 UI

### Phase 3：companies API（已完成）

- [x] 定义 companies 表 Drizzle schema（29 列，8 index，2 FK）
- [x] 定义 company_review_status / company_claimed_status / company_source 枚举
- [x] 生成 companies migration
- [x] 实现 GET /api/companies/search
- [x] 实现 POST /api/companies/community-submissions
- [x] 实现 GET /api/me/company-submissions
- [x] 建立 PublicCompanyView 白名单脱敏（src/lib/server/company-view.ts）
- [x] 建立 companies data access layer（src/lib/data/companies.ts）
- [x] mock fallback 保留，默认 NEXT_PUBLIC_API_ENABLED=false

### Phase 4：reviews API（已完成）

- [x] 定义 reviews 表 Drizzle schema（27 列，5 partial index，3 FK）
- [x] 定义 review_status / review_author_role / review_moderation_reason 枚举
- [x] 生成 reviews migration
- [x] 实现 GET /api/companies/:id/reviews（reviewable 公司约束，visible/limited_visible 过滤）
- [x] 实现 POST /api/reviews（content-guard + reviewable 约束，默认 pending_review）
- [x] 建立 PublicReviewView 白名单脱敏（src/lib/server/review-view.ts）
- [x] 建立 reviews data access layer（src/lib/data/reviews.ts）
- [x] mock fallback 保留，默认 NEXT_PUBLIC_API_ENABLED=false

### Phase 5：review_discussions API（已完成）

- [x] 定义 review_discussions 表 Drizzle schema（27 列，6 partial index，4 FK）
- [x] 定义 discussion_useful_votes 表 Drizzle schema（9 列，6 index + 3 个 partial unique，3 FK）
- [x] 定义 review_discussion_type / review_discussion_status / review_discussion_moderation_reason 枚举
- [x] 生成 migration
- [x] 实现 GET /api/reviews/:reviewId/discussions（只返回 visible/limited_visible 到 publicDiscussions）
- [x] 实现 POST /api/reviews/:reviewId/discussions（默认 pending_review，content-guard 校验）
- [x] 实现 POST /api/review-discussions/:discussionId/useful（无 voter identity 返回 401，防止匿名刷票）
- [x] 建立 PublicReviewDiscussionView 白名单脱敏（src/lib/server/review-discussion-view.ts）
- [x] 建立 discussions data access layer（src/lib/data/discussions.ts）
- [x] mock fallback 保留，默认 NEXT_PUBLIC_API_ENABLED=false

### Phase 6：moderation 最小队列（已完成）

- [x] 定义 discussion_moderation_events 表 Drizzle schema（11 列，3 index，2 FK）
- [x] 定义 discussion_moderation_actor_role 枚举（system/moderator/author，禁止 company/employer/hr）
- [x] 生成 migration
- [x] 实现 PATCH /api/moderation/review-discussions/:discussionId（moderator-only，无 auth 返回 401）
- [x] 实现 DELETE /api/review-discussions/:discussionId（author-only，deleted_by_author 终态，无 auth 返回 401）
- [x] 建立 moderation + delete data access layer mock fallback
- [x] 不做复杂审核后台 UI

## 当前不做

- 不实现登录
- 不实现审核后台 UI
- 不替换 mock-data
- 不接真实 AI
- 不接企业端
- 不接 Web3 / token / DAO

## 已建立的基础表

| 表 | 状态 | 说明 |
|---|---|---|
| users | Schema 已定义，migration 已生成 | 含 user_role / user_status enum，email/phone partial unique index |
| anonymous_profiles | Schema 已定义，migration 已生成 | 含 anonymous_scope_type enum，FK → users.id，user/fingerprint partial unique index |

### 匿名身份安全边界

- `user_role` 只允许 `user` / `moderator` / `admin`，明确禁止 `company` / `employer` / `hr`
- `anonymous_profiles` 公开 API 只返回 `id` / `displayLabel` / `avatarSeed`
- `userId` 和 `fingerprintHash` 永远不对外暴露
- MVP 默认使用 `scope_type = company`（每用户每公司一个稳定匿名身份）
