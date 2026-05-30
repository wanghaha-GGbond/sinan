# 司南 Web MVP API Contract

Phase 7 已完成认证与授权，全量 API 均已实现并可支持真实登录。

## 实现状态

| API | 状态 | Phase |
|---|---|---|
| `POST /api/auth/register` | 已实现 | Phase 7 |
| `POST /api/auth/login` | 已实现 | Phase 7 |
| `GET /api/auth/me` | 已实现 | Phase 7 |
| `GET /api/companies/search` | 已实现 | Phase 3 |
| `POST /api/companies/community-submissions` | 已实现 | Phase 3 |
| `GET /api/me/company-submissions` | 已实现 | Phase 3 |
| `GET /api/companies/:id/reviews` | 已实现 | Phase 4 |
| `POST /api/reviews` | 已实现 | Phase 4 |
| `GET /api/reviews/:reviewId/discussions` | 已实现 | Phase 5 |
| `POST /api/reviews/:reviewId/discussions` | 已实现 | Phase 5 |
| `POST /api/review-discussions/:discussionId/useful` | 已实现 | Phase 5 |
| `DELETE /api/review-discussions/:discussionId` | 已实现 | Phase 6 |
| `PATCH /api/moderation/review-discussions/:discussionId` | 已实现 | Phase 6 |
| `GET /api/companies/:id` | 契约已定义 | 后续 |
| `GET /api/companies/:id/ratings` | 契约已定义 | 后续 |

---

## 公司库 API

### GET /api/companies/search

搜索公司库。默认只返回可评价的公司，当前用户的待审核提交可选返回。

Query:

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `q` | `string` | 否 | 公司名、行业、城市关键词 |
| `city` | `string` | 否 | 城市筛选 |
| `industry` | `string` | 否 | 行业筛选 |
| `sort` | `"directionScore" \| "recommendationRate" \| "reviewCount"` | 否 | 排序方式 |
| `includeMySubmissions` | `boolean` | 否 | 是否包含当前用户的待审核/被拒提交 |

Response:

```ts
{
  companies: CompanyListItem[]
  mySubmissions?: CompanyListItem[]  // 仅当 includeMySubmissions=true 且用户登录
}
```

**可见性规则：**
- `companies` 默认只返回 `review_status = 'reviewable'` 的公司
- `mySubmissions` 返回当前用户提交的 `pending_review` / `rejected` 公司
- 企业不能通过搜索接口获取提交者身份

### GET /api/companies/:id

公司详情页数据。

Response 取决于 `review_status`：

**reviewable（正常）：**

```ts
type CompanyDetail = {
  id: string
  name: string
  registeredName?: string
  shortName: string
  englishName?: string
  aliases?: string[]
  unifiedSocialCreditCode?: string
  city: string
  industry: string
  size: string
  financingStage?: string
  website?: string
  foundedDate?: string
  description?: string
  logoUrl?: string
  source: "platform_seed" | "user_added" | "platform_verified" | "import"
  reviewStatus: "reviewable"
  claimedStatus: "unclaimed" | "claimed"
  // 聚合数据
  directionScore: number
  recommendationRate: number
  reviewCount: number
  salaryRange: string
  riskLevel: "低" | "中" | "高"
  riskTags: string[]
  highlights: string[]
  dimensions: RatingDimension[]
  scoreDistribution: { score: string; count: number }[]
  trend: { month: string; score: number; reviews: number }[]
  vibeTag?: CompanyVibeTag
  cbti?: CBTIProfile
}
```

**pending_review（仅提交者可见）：**

```ts
{
  id: string
  name: string
  registeredName: string
  unifiedSocialCreditCode: string
  city: string
  industry: string
  reviewStatus: "pending_review"
  source: "user_added"
  claimedStatus: "unclaimed"
  submittedAt: string
  // 不返回：方向分、体感标签、评论流、评价按钮
  // 不返回：提交者身份信息
}
```

**rejected（仅提交者可见）：**

```ts
{
  id: string
  name: string
  registeredName: string
  reviewStatus: "rejected"
  rejectionReason: string
  rejectedAt: string
  // 可重新提交
}
```

**非提交者访问 pending_review / rejected 公司 → 返回 404。**

### GET /api/me/company-submissions

返回当前用户提交的公司列表。

Response:

```ts
{
  submissions: Array<{
    id: string
    name: string
    registeredName: string
    unifiedSocialCreditCode: string
    city: string
    industry: string
    reviewStatus: "pending_review" | "reviewable" | "rejected"
    rejectionReason?: string
    submittedAt: string
    reviewedAt?: string
  }>
}
```

### POST /api/companies/community-submissions

社区共建公司库提交接口。

Request:

```ts
type CreateCompanyRequest = {
  registeredName: string
  unifiedSocialCreditCode: string
  registeredAddress: string
  legalRepresentative: string
  city: string
  industry: string
  shortName?: string
  size?: string
  website?: string
  financingStage?: string
  businessStatus?: string
  foundedDate?: string
  note?: string
}
```

Response (201):

```ts
type CreateCompanyResponse = {
  company: {
    id: string
    name: string                        // = shortName || registeredName
    registeredName: string
    unifiedSocialCreditCode: string
    city: string
    industry: string
    source: "user_added"
    reviewStatus: "pending_review"
    claimedStatus: "unclaimed"
    submittedAt: string
  }
}
```

**服务端处理规则：**
- 默认 `review_status = 'pending_review'`
- 默认 `source = 'user_added'`
- 默认 `claimed_status = 'unclaimed'`
- 校验统一社会信用代码格式（18 位）
- 校验敏感内容和攻击性表达
- 查询疑似重复公司（同信用代码或近似注册名）
- **提交者身份（`submitted_by_user_id`、`submitted_by_anonymous_profile_id`）写入但不对外返回**
- 该接口不是企业入驻，不产生企业账号
- 对同一用户频繁提交进行限速

**约束：**
- `pending_review` → 可审核为 `reviewable` 或 `rejected`
- `reviewable` → 全站可搜索、可评价
- `rejected` → 仅提交者可见，可查看拒绝原因，可重新提交
- 企业不能调用此接口进行入驻、认领或控评

## GET /api/companies/:id/ratings

方向评分页数据。

Response:

```ts
type CompanyRatings = {
  company: CompanyDetail
  sampleSize: number
  lastUpdatedAt: string
}
```

## GET /api/companies/:id/reviews

公司评价列表。

Query:

- `relation?: string`
- `scoreMin?: number`
- `tag?: string`
- `cursor?: string`

Response:

```ts
type Review = {
  id: string
  companyId: string
  role: string
  relation: "在职员工" | "离职员工" | "面试者" | "实习生" | "外包 / 派遣"
  tenure: string
  score: number
  title: string
  content: string
  tags: string[]
  helpful: number
  createdAt: string
  verifiedHint: string
}
```

## POST /api/reviews

发布匿名评价。正式实现必须先做匿名保护、反滥用和内容审核，不直接公开。

Request:

```ts
type CreateReviewRequest = {
  companyId?: string
  companyName: string
  relation: Review["relation"]
  role: string
  title: string
  content: string
  directionScore: number
  dimensions?: Record<string, number>
  interviewDifficulty?: number
  salaryRange?: string
}
```

Response:

```ts
type CreateReviewResponse = {
  id: string
  status: "anonymous_preview" | "pending_review" | "published" | "rejected"
  message: string
}
```

## POST /api/companies/:id/ratings

提交匿名方向评分。

Request:

```ts
type CreateRatingRequest = {
  directionScore: number
  dimensions: Record<string, number>
  note?: string
}
```

Response:

```ts
type CreateRatingResponse = {
  status: "anonymous_preview" | "pending_review"
  previewScore: number
}
```

## POST /api/ai/cbti/analyze

C-BTI 公司行为标签分析接口（预留，内部结构字段）。

Request:

```ts
type AnalyzeCBTIRequest = {
  companyId: string
  reviews: Array<{ id: string; score: number; content: string }>
  ratingSummary: {
    directionScore: number
    recommendationRate: number
    dimensions: Record<string, number>
  }
  questionnaireSummary: {
    salaryAvg?: number
    growthAvg?: number
    workLifeBalanceAvg?: number
    managementClarityAvg?: number
    collaborationAvg?: number
    stabilityAvg?: number
    integrityAvg?: number
    interviewExperienceAvg?: number
    canteenAvg?: number
    officeEnvironmentAvg?: number
    restroomAvg?: number
    afternoonTeaAvg?: number
    workstationComfortAvg?: number
    commuteConvenienceAvg?: number
    officeEquipmentAvg?: number
    officeExperienceAvg?: number
    paceDistribution?: Record<string, number>
    managementStyleDistribution?: Record<string, number>
    growthExperienceDistribution?: Record<string, number>
    collaborationStyleDistribution?: Record<string, number>
    overtimeLevelDistribution?: Record<string, number>
    promiseKeepingDistribution?: Record<string, number>
  }
}
```

Response:

```ts
type AnalyzeCBTIResponse = {
  cbti: {
    code: string
    title: string
    summary: string
    axes: { pace: "R" | "S"; management: "F" | "P"; growth: "G" | "B"; collaboration: "C" | "I" }
    confidence: number
    evidence: string[]
    updatedAt: string
  }
  officeExperienceInsight?: {
    score: number
    summary: string
    strengths: string[]
    weaknesses: string[]
  }
}
```

说明：当前前端仅使用 mock 推断，不接真实 AI 后端。办公体验字段仅作辅助信号，不直接决定 C-BTI。

## POST /api/ai/company-vibe/analyze

公司体感标签分析接口（预留，前台主展示）。

Request:

```ts
type AnalyzeCompanyVibeRequest = {
  companyId: string
  ratingSummary: {
    directionScore: number
    recommendationRate: number
    dimensions: Record<string, number>
  }
  reviewTexts: string[]
  questionnaireSummary?: Record<string, unknown>
  cbtiProfile?: {
    code: string
    confidence: number
  }
}
```

Response:

```ts
type AnalyzeCompanyVibeResponse = {
  vibeTag: {
    id: string
    name: string
    shortName: string
    summary: string
    signals: string[]
    riskLevel: "low" | "medium" | "high"
    tone: "positive" | "neutral" | "caution"
    confidence: number
    generatedBy: "ai" | "mock"
    updatedAt: string
  }
}
```

说明：前台主品牌使用“公司体感标签”；C-BTI 保留内部结构化分析用途。

## 评价追问与补充 API

### GET /api/reviews/:reviewId/discussions

查询单条评价下的追问与补充。返回两组数据：公开可见的讨论，以及当前用户自己的待处理讨论。

Query:

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `sort` | `”useful” \| “latest”` | 否 | 排序方式，默认 `useful` |

Response:

```json
{
  “publicDiscussions”: [
    {
      “id”: “discussion-1”,
      “reviewId”: “review-1”,
      “companyId”: “northstar-tech”,
      “type”: “supplement”,
      “authorRole”: “former_employee”,
      “authorLabel”: “匿名过来人”,
      “content”: “我补充一下，不同团队差异比较大。”,
      “maskedContent”: null,
      “createdAt”: “2026-05-21T08:00:00Z”,
      “updatedAt”: “2026-05-21T08:00:00Z”,
      “usefulCount”: 58,
      “replyCount”: 0,
      “isUsefulByCurrentUser”: false,
      “status”: “visible”,
      “moderationReason”: “none”,
      “tags”: [“团队差异”],
      “source”: “api”,
      “createdByCurrentUser”: false,
      “pendingSync”: false,
      “visibleToAuthor”: true,
      “visibleToPublic”: true,
      “participatesInRanking”: true,
      “reviewedAt”: “2026-05-21T08:30:00Z”,
      “score”: 188
    }
  ],
  “myDiscussions”: [
    {
      “id”: “discussion-99”,
      “reviewId”: “review-1”,
      “companyId”: “northstar-tech”,
      “type”: “question”,
      “authorRole”: “job_seeker”,
      “authorLabel”: “匿名求职者”,
      “content”: “请问加班情况如何？”,
      “maskedContent”: null,
      “createdAt”: “2026-05-21T09:00:00Z”,
      “updatedAt”: “2026-05-21T09:00:00Z”,
      “usefulCount”: 0,
      “replyCount”: 0,
      “isUsefulByCurrentUser”: false,
      “status”: “pending_review”,
      “moderationReason”: “none”,
      “tags”: [],
      “source”: “api”,
      “createdByCurrentUser”: true,
      “pendingSync”: false,
      “visibleToAuthor”: true,
      “visibleToPublic”: false,
      “participatesInRanking”: false,
      “reviewedAt”: null,
      “score”: null
    }
  ]
}
```

**publicDiscussions** — 只返回 `status IN ('visible', 'limited_visible')` 的讨论。按 `sort` 参数排序。

**myDiscussions** — 返回当前用户自己创建的、处于非公开状态的讨论：
- `local_pending` — 前端本地保存，服务端尚未确认
- `pending_review` — 服务端已收到，等待审核
- `hidden` — 平台隐藏
- `rejected` — 未通过审核
- `deleted_by_author` — 作者已删除

当 `status = limited_visible` 时：
- 对外（`publicDiscussions`）返回 `maskedContent`，不返回原始 `content`
- 对作者本人（`myDiscussions`）返回原始 `content`

`createdByCurrentUser` 是运行时字段，由 API 层根据请求用户身份计算，不存储在数据库中。

`isUsefulByCurrentUser` 查询 `discussion_useful_votes` 表确定当前用户是否已点有用。

---

### POST /api/reviews/:reviewId/discussions

发布追问或补充。

Request:

```json
{
  “companyId”: “northstar-tech”,
  “type”: “question”,
  “content”: “这个加班是整个公司都有，还是某些团队？”,
  “tags”: [“加班”, “团队差异”]
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `companyId` | `string` | 是 | 公司 ID |
| `type` | `”question” \| “supplement”` | 是 | 追问或补充 |
| `content` | `string` | 是 | 正文，5–300 字 |
| `tags` | `string[]` | 否 | 标签 |

Response:

```json
{
  “discussion”: {
    “id”: “discussion-100”,
    “reviewId”: “review-1”,
    “companyId”: “northstar-tech”,
    “type”: “question”,
    “authorRole”: “job_seeker”,
    “authorLabel”: “匿名求职者”,
    “content”: “这个加班是整个公司都有，还是某些团队？”,
    “maskedContent”: null,
    “status”: “pending_review”,
    “moderationReason”: “none”,
    “usefulCount”: 0,
    “replyCount”: 0,
    “isUsefulByCurrentUser”: false,
    “tags”: [“加班”, “团队差异”],
    “source”: “api”,
    “createdByCurrentUser”: true,
    “pendingSync”: false,
    “visibleToAuthor”: true,
    “visibleToPublic”: false,
    “participatesInRanking”: false,
    “createdAt”: “2026-05-21T10:00:00Z”,
    “updatedAt”: “2026-05-21T10:00:00Z”
  }
}
```

**服务端处理规则：**

1. 对 `content` 执行内容安全检查（见 `src/lib/content-guard.ts`）：
   - 检测手机号、邮箱、身份证号 → 自动打码 → `status = limited_visible`
   - 检测人身攻击、挂人曝光 → 拒绝，返回 422
2. 默认 `status = pending_review`，写入 `review_discussions` 表
3. 同时写入一条 `discussion_moderation_events` 记录（`from_status = NULL`, `to_status = pending_review`, `actor_role = author`）
4. **注意：`local_pending` 是前端本地状态，服务端不会持久化。** 服务端接收后返回 `pending_review` / `visible` / `limited_visible` 之一

**内容安全规则（与前端 content-guard 对齐）：**

- 不允许手机号格式（`1[3-9]\d{9}`）
- 不允许邮箱格式
- 不允许身份证号格式（17 位数字 + 数字/X）
- 不允许攻击性词汇
- 最少 5 字，最多 300 字

**权限规则：**
- 企业不能通过该接口回复、控评或获取匿名身份
- 未登录用户可以发布（限速），使用 `anonymous_profile_id` 或 fingerprint 去重

---

### POST /api/review-discussions/:discussionId/useful

设置追问与补充的有用状态。支持投票和取消投票。

Request:

```json
{
  “useful”: true
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `useful` | `boolean` | 是 | `true` 标记有用，`false` 取消有用 |

Response (200):

```json
{
  “usefulCount”: 59,
  “isUsefulByCurrentUser”: true
}
```

**服务端处理规则：**

1. **前置校验** — 目标 discussion 的 `status` 必须是 `visible` 或 `limited_visible`，否则返回 403
2. **去重** — 根据用户身份（`user_id` / `anonymous_profile_id` / `voter_fingerprint_hash`）查询现有 vote
3. **投票** — `useful = true` 且无现有有效 vote → INSERT 到 `discussion_useful_votes`，`review_discussions.useful_count + 1`
4. **取消投票** — `useful = false` 且有现有有效 vote → 设置 `discussion_useful_votes.deleted_at = now()`，`review_discussions.useful_count - 1`
5. **重复投票** — 已有有效 vote 且 `useful = true` → 幂等返回当前状态
6. vote 记录保留（软删除），不做物理删除，方便反作弊和审计

**权限规则：**
- 只有 `status IN ('visible', 'limited_visible')` 的 discussion 可以被点有用
- 对 `draft` / `local_pending` / `pending_review` / `hidden` / `rejected` / `deleted_by_author` 的投票请求返回 403
- 企业可以投票（作为普通用户身份），但不能通过投票机制干预排序

---

### DELETE /api/review-discussions/:discussionId

作者删除自己的追问或补充。

Response (200):

```json
{
  “discussion”: {
    “id”: “discussion-100”,
    “status”: “deleted_by_author”,
    “deletedAt”: “2026-05-22T10:00:00Z”
  }
}
```

**服务端处理规则：**

1. 校验请求用户是 discussion 的 `author_user_id`（或匹配 `anonymous_profile_id`），否则返回 403
2. 更新 `review_discussions.status = 'deleted_by_author'`，`review_discussions.deleted_at = now()`
3. 写入一条 `discussion_moderation_events` 记录（`from_status = 当前状态`, `to_status = deleted_by_author`, `actor_role = author`, `reason = author_deleted`）
4. `deleted_by_author` 是终态，不可逆
5. 企业不能调用此接口

---

### PATCH /api/moderation/review-discussions/:discussionId

未来 moderator 专用接口。当前不实现 UI，仅在 API contract 中预留。

Request:

```json
{
  “status”: “visible”,
  “reason”: “manual_review”,
  “note”: “内容无违规”,
  “maskedContent”: null
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `status` | `ReviewDiscussionStatus` | 是 | 目标状态 |
| `reason` | `ReviewDiscussionModerationReason` | 否 | 变更原因 |
| `note` | `string` | 否 | 审核备注 |
| `maskedContent` | `string` | 否 | 打码后内容（用于 limited_visible） |

**服务端处理规则：**

1. 校验调用者角色为 `moderator`，否则返回 403
2. 更新 `review_discussions.status`，必要时更新 `masked_content`、`moderation_reason`、`reviewed_at`
3. 写入 `discussion_moderation_events` 记录
4. 重新计算 `visible_to_public`、`participates_in_ranking` 等可见性标记

**禁止的角色：**
- `company` / `employer` / `HR` 不能调用此接口
- 服务端必须硬编码拒绝企业角色的 moderation 请求

---

## 评价追问与补充 Moderation 状态机

### 状态定义

`ReviewDiscussionStatus`（与前端 `src/lib/types.ts` 完全对齐）：

| 状态 | 存储位置 | 持久化 | 公开可见 | 作者可见 | moderator 可见 | 可被点有用 |
|---|---|---|---|---|---|---|
| `draft` | 前端本地 | 可选 | 否 | 是 | 否 | 否 |
| `local_pending` | **前端本地** | **否** | 否 | 是 | 否 | 否 |
| `pending_review` | 服务端 | 是 | 否 | 是 | 是 | 否 |
| `visible` | 服务端 | 是 | 是 | 是 | 是 | 是 |
| `limited_visible` | 服务端 | 是 | 是 (打码) | 是 (原文) | 是 (原文) | 是 |
| `hidden` | 服务端 | 是 | 否 | 是 (仅状态) | 是 | 否 |
| `rejected` | 服务端 | 是 | 否 | 是 (仅状态) | 是 | 否 |
| `deleted_by_author` | 服务端 | 是 | 否 | 是 (仅状态) | 是 | 否 |

**关键区分**：`local_pending` 是**前端本地状态**。它是用户在无后端环境下提交内容后、浏览器的即时反馈。服务端不会持久化 `local_pending`。当真实后端接入后，POST 返回的状态是 `pending_review` / `visible` / `limited_visible` 之一。

### 状态流转

```
draft ──(作者提交)──> local_pending (前端本地)
                       │
                       │ (真实后端接入后，POST 返回)
                       ▼
                  pending_review
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
       visible   limited_visible  rejected
          │            │
          │            │
          └─────┬──────┘
                │
        ┌───────┼───────┐
        │               │
        ▼               ▼
     hidden      deleted_by_author
                  (终态，不可逆)
```

### 可见性规则

**公开列表（`publicDiscussions`）：**
- 只包含 `status IN ('visible', 'limited_visible')`
- `limited_visible` 返回 `maskedContent`，不返回原始 `content`
- 排序由 `sort` 参数控制（`useful` / `latest`）

**作者待处理列表（`myDiscussions`）：**
- 包含当前用户创建的、处于非公开状态的讨论
- `local_pending` — 前端本地状态，服务端未确认
- `pending_review` — 等待审核
- `hidden` — 平台隐藏，显示状态提示
- `rejected` — 未通过审核，显示状态提示
- `deleted_by_author` — 已删除，显示状态提示
- 不展示有用按钮

**公开排序（`participatesInRanking`）：**
- 只有 `visible` 和 `limited_visible` 参与排序
- `limited_visible` 排序权重略低（-5 分惩罚）
- 非公开状态不参与排序（-1000 分惩罚，确保排在最后）

### 企业权限限制

企业 / 雇主 / HR **不能**：
- 触发 `hidden` 或 `rejected` 状态变更
- 调用 `PATCH /api/moderation/review-discussions/:discussionId`
- 通过申诉直接隐藏内容
- 查看 `myDiscussions` 中其他用户的内容
- 获取 `author_user_id`、`anonymous_profile_id`、`author_fingerprint_hash`
- 通过 moderation 机制控评

企业的反馈（如果未来支持）必须以**公开回应**的形式出现在 discussion 中，而非审核权。
