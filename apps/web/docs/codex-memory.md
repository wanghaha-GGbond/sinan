# Codex Memory

## Project Identity

- Project: 司南
- Slogan: 入职前，先看清方向。
- Positioning: C 端匿名公司方向评分、公司评价、面试体验、薪资区间与入职避坑平台。

## Current Technical State

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui base-nova
- TanStack Query for mock query state
- React Hook Form + Zod for submit flow
- Recharts for rating charts
- Playwright for e2e validation

## Product Constraints

- Do not connect real backend in MVP.
- Do not write database migration in MVP.
- Do not implement Web3, token, DAO, wallet login, or airdrop.
- Do not give companies controls to delete reviews, change scores, buy ranking, or view user identity.
- Do not use entertainment or attack language such as 神评、黑公司、曝光、挂人、撕.

## Core Route

`/company/[id]` and `/company/northstar-tech/ratings` should both prioritize company-specific review reading.
`/company/[id]/reviews/[reviewId]` is the detail-read route for deep reading and useful feedback.

The product should feel like a lightweight anonymous company review community, not a company analysis report, admin dashboard, or entertainment forum.

## Current UI Rule

- 借鉴多邻国式轻游戏化机制，但不复制其视觉资产。
- 使用司南语言：方向值、连续点灯、今日指路任务、司南徽章、指路等级。
- 游戏化服务于贡献反馈，评论流始终是公司页核心。
- 当前绝对核心：公司维度匿名评价阅读流（非报告页）。
- 阅读闭环：有用、展开、详情、上一条/下一条。
- UI 质感策略：借鉴多邻国式圆润与强反馈，但不复制其角色、插画、配色、布局；毛玻璃仅用于壳层与浮层。

## IA Update (Round 7)

司南信息架构调整：
- 首页从搜索门户改为推荐流；
- 首页 topbar 收敛为“推荐 / 搜索”；
- 搜索成为辅助入口；
- 推荐流向用户推荐公司评价；
- 用户点击推荐卡进入公司评分与评论区；
- 公司页移除右侧方向分侧栏；
- 公司 sticky header 压缩为轻量上下文提示；
- 评论区主列加宽，成为公司页绝对主角。

## Recommend Feed Brand Upgrade

司南首页从搜索门户转为推荐流。
推荐流基于 mock 用户偏好展示公司评价推荐。
推荐卡必须解释为什么推荐、公司方向分、关键评分、代表评价、适合/慎重人群。
首页搜索入口收敛到右上角。
推荐流服务于公司评分与评论阅读区。

## 首页顶部视觉收口（本轮）

首页推荐流顶部删除说明型文案。
首页 topbar 收敛为“推荐 / 搜索”。
司南品牌不靠长文案解释，而靠推荐理由、方向分、关键指标、适合/慎重信息表达判断力。
配色从白橙绿调整为雾灰绿、墨蓝、司南青绿和少量琥珀风险色。

## Solid C 端风格收口（本轮）

司南移除“工友”词汇，统一改为“过来人 / 匿名评价者 / 后来者”。
司南 UI 从轻线框风格转向高对比 solid C 端风格。
司南借鉴多邻国式固态按钮、圆润卡片、明确反馈，但不复制其角色、插画、配色和布局。
毛玻璃降级为浮层辅助，推荐卡和评论卡以实体白底和 solid 层级为主。

## Solid 组件化与视觉基线（本轮）

司南已抽象 solid 视觉组件，包括 SolidButton、SolidCard、ScoreChip、TagPill、MetricPill 等。
/search 和 /rankings 已统一到高对比 solid C 端风格。
推荐卡和评论卡以实体白底、圆润卡片、2.5D 阴影和 solid 交互为主。
毛玻璃仅保留为浮层辅助，不作为主卡片风格。
建立或准备建立桌面端和移动端视觉回归基线，防止后续 UI 回退。

## SolidTopbar + ReviewCard 组件化与视觉回归升级（本轮）

司南已抽象 SolidTopbar，用于统一首页、搜索页、榜单页、内容页的顶部导航。
ReviewCard 已迁移到 SolidCard、SolidButton、ScoreChip、TagPill 等 solid primitives。
视觉测试从简单截图生成升级为 Playwright toHaveScreenshot baseline，对 desktop/mobile 核心页面进行视觉回归保护。
后续 UI 改动必须同步更新视觉基线，避免 solid 风格回退。

## 推荐流简化 + 结构化问卷 + 公司体感标签（本轮）

首页推荐卡改为短结构：推荐理由、公司基础信息、方向分、评价数、推荐率、关键评分、公司体感标签、进入公司页。
首页不再展示长评价、适合/慎重、大量标签，推荐流目标回到“快速判断并进入公司页”。
发布评价新增“结构化问卷，可跳过”，用于补充评分和公司行为信号。
前台主展示升级为“公司体感标签”（如：仓鼠笼公司、火箭发射台公司、温水鱼缸公司）。
C-BTI（Company Behavior Type Indicator）保留为内部结构字段，不再作为前台主展示文案。
当前体感标签由 mock 推断逻辑生成；真实 AI 分析接口见 `docs/ai-cbti-api.md`。

## 办公体验问卷补充（本轮）

结构化问卷新增“办公体验”分组：食堂、办公环境、厕所、下午茶、工位舒适度、通勤便利度、办公设备、办公体验指数。
办公体验字段为可选，不影响快速发布评价。
办公体验指数可作为公司日常体验辅助判断，也可作为公司体感 / C-BTI AI 分析辅助输入，但不直接决定 C-BTI。
首页与公司页可轻量展示办公体验指数，不展示全部细项。

## 发布评价链路修正（本轮）

发布评价已支持新增未收录公司：
- 搜索无结果时可新增公司并继续评价；
- 新增公司默认 `source=user_added`、`pendingReview=true`、`unclaimed`；
- 不接真实后端，不暴露用户身份给企业。

问卷体验继续降噪：
- 问卷主视觉为中央题卡；
- 右侧大状态不再作为主视觉；
- 顶部小进度与完成页奖励承担反馈。

## P0 交付记录（新增）

- Company 模型补齐 `claimedStatus`，并在 mock 公司中默认设为 `unclaimed`。
- 新增公司流程默认 `source=user_added`、`pendingReview=true`、`createdByUser=true`，新增后写入 `companyId` 继续评价。
- 全屏问卷新增末题跳过完成分支，确保“最后一题答完/跳过”均可进入完成态并回传答案。
- 发布路径关键按钮继续统一到 `SolidButton`，减少旧样式残留。
- `/submit/review` 以 `selectedCompany` 作为公司选择唯一状态源；`companyId`/`companyName` 在选择或新增后同步绑定。
- 无结果卡仅在 `mode=searching` 且 `query` 命中无匹配且未选中公司时显示。

## 社区共建公司库原则（新增）

司南公司库由求职者和真实经历者社区共建，不由企业入驻控制。
未收录公司需要提交注册信息：公司名称、统一社会信用代码、注册地址、法定代表人、注册城市、所属行业。
新增公司默认进入 `pending_review`，审核通过后才进入 `reviewable` 可评价状态。
`pending_review` 公司仅提交者本地可见，不进入推荐流或公共搜索；`rejected` 公司不可评价。
新增公司表单已接入疑似重复公司提示、注册信息格式校验、敏感信息与攻击性表达过滤。
当前仍使用 mock 状态模拟，不接真实后端、不做审核后台。
新增公司不是企业入驻，不产生企业账号，不赋予企业控评能力。

## 评价详情页追问与补充

- 新增 ReviewDiscussionItem 数据结构与 mock 讨论数据。
- 评价详情页接入 ReviewDiscussionSection，支持发布追问、发布补充、有用切换、高赞/最新排序。
- 追问与补充内容复用基础内容安全规则，禁止手机号、邮箱、人身攻击、挂人曝光等内容。
- 本轮仅使用本地状态，不接真实后端。

## 追问与补充规则增强

- ReviewDiscussionItem 已增强状态字段：updatedAt、replyCount、moderationReason、source、createdByCurrentUser、pendingSync、score。
- 高赞排序由 `src/lib/review-discussion-sort.ts` 计算，综合 usefulCount、补充类型、作者角色、新鲜度和 pending 惩罚。
- Composer 使用 `src/lib/discussion-draft-storage.ts` 保存本地草稿，发布成功后清除。
- API contract 已补充 discussion 列表、发布和有用反馈接口草案。

## Discussion Moderation 前置设计

- ReviewDiscussionStatus 已扩展为 draft、local_pending、pending_review、visible、limited_visible、hidden、rejected、deleted_by_author。
- `src/lib/review-discussion-sort.ts` 提供 public / author status 过滤，公开排序只处理 visible / limited_visible。
- `maskSensitiveContent` 用于 limited_visible 打码，手机号、邮箱、身份证号分别替换为占位文本。
- ReviewDiscussionSection 分为公开列表和”我的待处理内容”，非公开状态不展示有用按钮。

## 真实 API 前 Schema 草案（本轮）

- 已完成 `docs/backend-schema.md`，设计 reviews、review_discussions、discussion_moderation_events、discussion_useful_votes 四张核心表。
- `docs/api-contract.md` 已补充完整的 discussion moderation 状态机、publicDiscussions/myDiscussions 返回格式、useful votes 权限规则、DELETE/PATCH 端点定义。
- 企业不能成为 moderation actor — `actor_role` 枚举禁止 `company`、`employer`、`hr`。
- `local_pending` 是前端本地状态，服务端不持久化。真实后端 POST 后返回 `pending_review` / `visible` / `limited_visible` 之一。
- `visible` 和 `limited_visible` 才进入公开排序和公开展示；`pending_review` / `hidden` / `rejected` / `deleted_by_author` 仅作者和 moderator 可见。
- `limited_visible` 对外返回 `maskedContent`（打码版），对作者本人返回原始 `content`。
- 有用投票通过 `discussion_useful_votes` 去重，支持软删除取消投票，保留审计线索。
- `discussion_moderation_events` 记录每一次状态变更的完整历史，支持可追溯审核。
- 索引设计以 partial index 为主（`WHERE status IN ('visible', 'limited_visible')`），覆盖最常用的公开列表查询。
- 本轮只改 docs，不改 UI、不改业务代码、不改测试。

## 真实 API 前基础实体 Schema 草案（本轮）

- 已完成 `users`、`anonymous_profiles`、`companies` 三个基础实体的 schema 设计，补充进 `docs/backend-schema.md`。
- `users` 是账户实体，不等于企业账号。role 枚举只允许 `user` / `moderator` / `admin`，明确禁止 `company`、`employer`、`hr`。
- `anonymous_profiles` 是匿名身份核心安全基础设施。一个 user 可以有多个 anonymous_profile，MVP 推荐 `scope_type=company`（每用户每公司一个稳定匿名身份）。
- anonymous_profile 对外只暴露 `id`、`display_label`、`avatar_seed`；`user_id`、`fingerprint_hash` 永远不对外返回。
- 企业永远不能获取 `user_id`、`fingerprint_hash`、跨公司 anonymous_profile 映射关系。
- `companies` 是被评价对象，不是平台客户。`review_status` 三态：`pending_review`（待审核，不可评价）、`reviewable`（可评价，进入公开搜索）、`rejected`（不通过，仅提交者可见）。
- `reviews.company_id` 和 `review_discussions.company_id` 只能引用 `review_status = 'reviewable'` 的公司。
- `claimed_status` 字段预留但本阶段不实现企业认领或企业权限。
- 公司提交者身份（`submitted_by_user_id`、`submitted_by_anonymous_profile_id`）不对外公开。
- `company_submissions` 独立表方案 B 已设计，MVP 建议先用方案 A（companies 表直接承载提交记录）。
- `docs/api-contract.md` 已补充 `GET /api/companies/search`、`GET /api/me/company-submissions`、更新 `GET /api/companies/:id` 可见性规则、精细化 `POST /api/companies/community-submissions`。
- 本轮只改 docs，不改 UI、不改业务代码、不改测试。

## Phase 1 后端基础设施（本轮）

Phase 1 后端基础设施开始：项目选择 PostgreSQL + Neon + Drizzle ORM。
当前只接入 Drizzle 配置（drizzle.config.ts）、db client（src/db/client.ts）、schema/migrations 目录（src/db/schema/、src/db/migrations/）和 .env.example。
本阶段不创建业务表、不实现 API、不改 UI、不删除 mock。
后续 Phase 2 才定义 users 与 anonymous_profiles。
后续 Phase 3 才实现 companies search / community submissions API。

## Phase 2 后端基础表（本轮）

Phase 2 后端基础表已定义：users 与 anonymous_profiles 的 Drizzle schema 完成，migration 已生成。
user_role 只允许 user / moderator / admin，不允许 company / employer / hr。
user_status 枚举：active / suspended / deleted。
anonymous_scope_type 枚举：global / company / review / discussion，MVP 默认采用 company scope。
匿名身份核心约束：公开 API 只返回 anonymous_profile_id、display_label、avatar_seed，永远不返回 user_id 或 fingerprint_hash。
server 端匿名身份工具函数已建立（src/lib/server/anonymous-profile.ts），当前为纯函数+TODO，待 Phase 3 API routes 就绪后接入 db。
本阶段不做登录系统、不实现 API routes、不改 UI、不改 mock-data。

## Phase 3 公司库 Schema 与 API（本轮）

Phase 3 公司库后端开始：companies 表 Drizzle schema 已定义（29 列，8 index，2 FK），migration 已生成。
company_review_status 三态：pending_review（待审核，不可评价，不公开搜索）、reviewable（通过，可搜索可评价）、rejected（拒绝，仅提交者可见）。
company_claimed_status 预留字段（unclaimed/claimed），本阶段不实现企业认领。
company_source 枚举：platform_seed / user_added / platform_verified / import。
第一批公司库 API 已实现：
- GET /api/companies/search — 搜索可评价公司（默认只返回 reviewable，ILIKE 匹配 name/shortName/registeredName/englishName）
- POST /api/companies/community-submissions — 提交未收录公司（校验信用代码格式 + content-guard，查重，默认 pending_review）
- GET /api/me/company-submissions — 获取我的提交（当前返回空，待 auth 就绪）
PublicCompanyView 白名单脱敏：永远不返回 submittedByUserId、submittedByAnonymousProfileId、rejectionReason、deletedAt。
Data access layer 已建立（src/lib/data/companies.ts），默认 NEXT_PUBLIC_API_ENABLED=false，走 mock fallback。
企业仍无入驻、认领、控评权限。

## Phase 4 评价 Schema 与 API（本轮）

Phase 4 评价后端开始：reviews 表 Drizzle schema 已定义（27 列，5 partial index，3 FK），migration 已生成。
review_status 七态：draft / pending_review / visible / limited_visible / hidden / rejected / deleted_by_author。
review_author_role 枚举：job_seeker / current_employee / former_employee / interviewee / intern / contractor / anonymous。
明确禁止 company / employer / hr 作为 author_role 或 moderation actor。
评价 API 已实现：
- GET /api/companies/:id/reviews — 获取公司公开评价列表（验证 company 存在且 reviewable，只返回 visible/limited_visible，支持 sort=useful|latest 和 cursor 分页）
- POST /api/reviews — 发布评价（验证 reviewable 公司约束 + content-guard 安全检查，默认 pending_review，不直接 visible）
PublicReviewView 白名单脱敏：永远不返回 authorUserId、anonymousProfileId、authorFingerprintHash、moderationReason、deletedAt；limited_visible 评价使用 maskedContent。
Data access layer 已建立（src/lib/data/reviews.ts），默认 NEXT_PUBLIC_API_ENABLED=false，走 mock fallback。
企业仍无控评、删评、审核权限。pending_review 公司不可被评价。

## Phase 5 讨论 Schema 与 API（本轮）

Phase 5 讨论后端开始：review_discussions 表 Drizzle schema 已定义（27 列，6 partial index，4 FK），discussion_useful_votes 表已定义（9 列，6 index + 3 partial unique，3 FK），migration 已生成。
review_discussion_type 枚举：question / supplement。
review_discussion_status 八态：draft / local_pending / pending_review / visible / limited_visible / hidden / rejected / deleted_by_author。
讨论 API 已实现：
- GET /api/reviews/:reviewId/discussions — 获取评价下的公开讨论（验证 review 存在且公开，只返回 visible/limited_visible 到 publicDiscussions，myDiscussions 当前为空，支持 sort/cursor 分页）
- POST /api/reviews/:reviewId/discussions — 发布追问/补充（验证 review 公开 + companyId 匹配 + content-guard 安全检查，默认 pending_review）
- POST /api/review-discussions/:discussionId/useful — 有用投票（验证 discussion 公开，无 voter identity 时返回 401 防匿名刷票，future auth 就绪后实现 upsert + 计数更新）
PublicReviewDiscussionView 白名单脱敏：永远不返回 authorUserId、anonymousProfileId、authorFingerprintHash、moderationReason、deletedAt；limited_visible 返回 maskedContent。
useful_votes 三种去重维度：user_id partial unique、anonymous_profile_id partial unique、voter_fingerprint_hash partial unique（均 WHERE deleted_at IS NULL）。
Data access layer 已建立（src/lib/data/discussions.ts），mock fallback 绕过 voter identity 限制支持本地 +1/-1。
企业仍无审核、隐藏、删除、控评权限。

## Phase 6 Moderation 审计与作者删除 API（本轮）

Phase 6 审核基础设施完成：discussion_moderation_events 表 Drizzle schema 已定义（11 列，3 index，2 FK），migration 已生成。
discussion_moderation_actor_role 枚举：system / moderator / author。明确禁止 company / employer / hr 作为 actor_role。
moderation_events 记录每次状态变更的完整审计历史：discussion_id, actor, from_status → to_status, reason, note, raw/masked content snapshots, created_at。
审核与删除 API 已实现：
- PATCH /api/moderation/review-discussions/:discussionId — moderator 状态变更（visible/limited_visible/hidden/rejected，无 moderator auth 时返回 401）
- DELETE /api/review-discussions/:discussionId — 作者删除（deleted_by_author 终态不可逆，无 author auth 时返回 401）
Data access layer mock fallback：deleteReviewDiscussionData（仅 createdByCurrentUser 可删除）+ moderateReviewDiscussionData（直接修改 status + visibility flags）。
Phase 3-6 全量 API 均已完成（companies search/submit, reviews read/write, discussions read/write/useful, moderation, author delete）。
企业仍无审核、隐藏、删除、控评权限。

## Phase 7 认证与授权（本轮）

Phase 7 认证系统完成。JWT auth 工具已建立（src/lib/server/auth.ts）：scrypt 密码哈希 + jose JWT 签名/验证 + httpOnly cookie（auth_token, secure, sameSite=lax, 30 天）。
Auth API：POST /api/auth/register（email/phone + password 注册自动登录）、POST /api/auth/login（验证凭证设置 cookie）、GET /api/auth/me（返回用户信息）。
anonymous_profile 真实实现：getOrCreateAnonymousProfile DB 查询/创建，scope_type=company 策略。
所有 auth-gated API 已启用真实逻辑：
- POST /api/reviews → 写入 authorUserId/anonymousProfileId
- POST/GET /api/reviews/:reviewId/discussions → 写入作者身份 + myDiscussions 查询
- POST useful → 真实 upsert + usefulCount 更新
- DELETE discussion → requireAuthUser → 验证 authorUserId → soft delete + moderation event
- PATCH moderation → requireModerator → status 变更 + visibility flags + moderation event
无登录时 API 兼容（authorUserId 为 null），不影响匿名使用。
