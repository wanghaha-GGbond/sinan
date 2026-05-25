# 司南 Web MVP API Contract

当前 MVP 使用 mock 数据，不接真实后端。以下契约由页面反推，用于后续 API、数据库和内容审核设计。

## GET /api/companies

查询公司列表。

Query:

- `q?: string` 公司名、行业、城市关键词。
- `sort?: "directionScore" | "recommendationRate" | "reviewCount"`

Response:

```ts
type CompanyListItem = {
  id: string
  name: string
  shortName: string
  industry: string
  city: string
  size: string
  stage: string
  directionScore: number
  recommendationRate: number
  reviewCount: number
  salaryRange: string
  riskLevel: "低" | "中" | "高"
  riskTags: string[]
}
```

## GET /api/companies/:id

公司详情页数据。

Response:

```ts
type CompanyDetail = CompanyListItem & {
  highlights: string[]
  dimensions: RatingDimension[]
  scoreDistribution: { score: string; count: number }[]
  trend: { month: string; score: number; reviews: number }[]
}
```

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

C-BTI 公司行为标签分析接口（预留）。

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

## POST /api/companies

新增未收录公司（C 端评价流程内轻量补充）。

Request:

```ts
type CreateCompanyRequest = {
  name: string
  city: string
  industry: string
  size?: string
  alias?: string
  website?: string
  financingStage?: string
}
```

Response:

```ts
type CreateCompanyResponse = {
  company: Company
}
```

约束：
- 默认 `claimedStatus` 为未认领。
- 默认 `source` 为 `user_added`，`pendingReview` 为 `true`。
- 建议同时写入 `createdByUser=true` 作为审核与可见性策略辅助字段。
- 该接口不提供企业认领或控评能力。
- 新增公司行为不向企业暴露用户身份。
