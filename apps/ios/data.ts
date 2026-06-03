export type MobileReview = {
  id: string
  companyId: string
  title: string
  content: string
  authorLabel: string
  authorRole: string
  employmentStatus: "在职员工" | "离职员工" | "面试者" | "实习生" | "外包"
  city: string
  directionScore: number
  usefulCount: number
  discussionCount: number
  createdAt: string
  tags: string[]
  shortComment?: string
  trustLevel?: number
  verified?: boolean
  salaryRange?: string
  interviewRounds?: string
}

export type MobileCompany = {
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
  recentReviewCount: number
  salaryRange: string
  highlights: string[]
  riskTags: string[]
  vibe: string
  officeScore: number
  commuteScore: number
  canteenScore: number
  interviewScore: number
  roles: string[]
  dimensions: Array<{ key: string; label: string; score: number; description: string }>
  scoreDistribution: Array<{ score: string; count: number }>
  trend: Array<{ month: string; score: number; reviews: number }>
}

export type MobileDiscussion = {
  id: string
  companyId: string
  reviewId?: string
  type: "追问" | "补充"
  authorLabel: string
  content: string
  usefulCount: number
  tags: string[]
}

export const companies: MobileCompany[] = [
  {
    id: "northstar-tech",
    name: "北辰智造科技",
    shortName: "北辰智造",
    industry: "AI 工具 / 企业协作",
    city: "上海",
    size: "500-1000 人",
    stage: "C 轮",
    directionScore: 7.4,
    recommendationRate: 72,
    reviewCount: 1304,
    recentReviewCount: 128,
    salaryRange: "25k-42k x 14",
    highlights: ["工程流程成熟", "核心团队稳定", "项目复杂度高"],
    riskTags: ["业务变化快", "绩效口径需确认", "跨部门沟通成本"],
    vibe: "快节奏成长型",
    officeScore: 7.0,
    commuteScore: 8.1,
    canteenScore: 7.8,
    interviewScore: 7.0,
    roles: ["前端工程师", "后端工程师", "产品经理", "算法工程师"],
    dimensions: [
      { key: "growth", label: "成长方向", score: 8.1, description: "项目复杂度、学习密度与导师投入" },
      { key: "management", label: "管理清晰度", score: 6.8, description: "目标、汇报线、绩效反馈是否稳定" },
      { key: "workload", label: "工作负荷", score: 6.4, description: "加班波动、排期弹性与恢复时间" },
      { key: "pay", label: "薪资兑现", score: 7.7, description: "薪资区间、奖金兑现与调薪透明度" },
      { key: "respect", label: "尊重与边界", score: 7.2, description: "沟通方式、个人边界与匿名安全感" },
    ],
    scoreDistribution: [
      { score: "0-2", count: 42 },
      { score: "2-4", count: 96 },
      { score: "4-6", count: 214 },
      { score: "6-8", count: 602 },
      { score: "8-10", count: 332 },
    ],
    trend: [
      { month: "1月", score: 7.0, reviews: 86 },
      { month: "2月", score: 7.2, reviews: 92 },
      { month: "3月", score: 7.1, reviews: 118 },
      { month: "4月", score: 7.5, reviews: 141 },
      { month: "5月", score: 7.4, reviews: 128 },
    ],
  },
  {
    id: "lighthouse-media",
    name: "灯塔互动传媒",
    shortName: "灯塔互动",
    industry: "内容平台 / 增长营销",
    city: "杭州",
    size: "1000-3000 人",
    stage: "已上市",
    directionScore: 6.1,
    recommendationRate: 54,
    reviewCount: 824,
    recentReviewCount: 92,
    salaryRange: "16k-28k x 13",
    highlights: ["增长体系成熟", "项目曝光高", "成长速度快"],
    riskTags: ["加班波动", "目标压力", "调休规则需确认"],
    vibe: "训练场公司",
    officeScore: 6.9,
    commuteScore: 7.6,
    canteenScore: 6.9,
    interviewScore: 6.3,
    roles: ["内容运营", "商业化产品", "实习运营", "销售运营"],
    dimensions: [
      { key: "growth", label: "成长方向", score: 6.9, description: "项目复杂度、学习密度与导师投入" },
      { key: "management", label: "管理清晰度", score: 5.8, description: "目标、汇报线、绩效反馈是否稳定" },
      { key: "workload", label: "工作负荷", score: 4.7, description: "加班波动、排期弹性与恢复时间" },
      { key: "pay", label: "薪资兑现", score: 6.2, description: "薪资区间、奖金兑现与调薪透明度" },
      { key: "respect", label: "尊重与边界", score: 5.9, description: "沟通方式、个人边界与匿名安全感" },
    ],
    scoreDistribution: [
      { score: "0-2", count: 81 },
      { score: "2-4", count: 136 },
      { score: "4-6", count: 277 },
      { score: "6-8", count: 245 },
      { score: "8-10", count: 85 },
    ],
    trend: [
      { month: "1月", score: 6.4, reviews: 64 },
      { month: "2月", score: 6.0, reviews: 81 },
      { month: "3月", score: 6.2, reviews: 77 },
      { month: "4月", score: 5.8, reviews: 103 },
      { month: "5月", score: 6.1, reviews: 92 },
    ],
  },
  {
    id: "river-finance",
    name: "江流数科",
    shortName: "江流数科",
    industry: "金融科技",
    city: "深圳",
    size: "300-500 人",
    stage: "B+ 轮",
    directionScore: 7.9,
    recommendationRate: 78,
    reviewCount: 476,
    recentReviewCount: 61,
    salaryRange: "28k-50k x 15",
    highlights: ["薪资兑现稳定", "团队边界感较好", "技术栈较新"],
    riskTags: ["合规流程重", "面试轮次较多"],
    vibe: "稳定流程型",
    officeScore: 7.0,
    commuteScore: 6.0,
    canteenScore: 6.1,
    interviewScore: 7.4,
    roles: ["风控算法", "后端工程师", "法务", "财务BP"],
    dimensions: [
      { key: "growth", label: "成长方向", score: 8.0, description: "项目复杂度、学习密度与导师投入" },
      { key: "management", label: "管理清晰度", score: 7.8, description: "目标、汇报线、绩效反馈是否稳定" },
      { key: "workload", label: "工作负荷", score: 7.1, description: "加班波动、排期弹性与恢复时间" },
      { key: "pay", label: "薪资兑现", score: 8.6, description: "薪资区间、奖金兑现与调薪透明度" },
      { key: "respect", label: "尊重与边界", score: 8.1, description: "沟通方式、个人边界与匿名安全感" },
    ],
    scoreDistribution: [
      { score: "0-2", count: 18 },
      { score: "2-4", count: 44 },
      { score: "4-6", count: 86 },
      { score: "6-8", count: 172 },
      { score: "8-10", count: 156 },
    ],
    trend: [
      { month: "1月", score: 7.5, reviews: 44 },
      { month: "2月", score: 7.7, reviews: 49 },
      { month: "3月", score: 7.8, reviews: 52 },
      { month: "4月", score: 8.0, reviews: 57 },
      { month: "5月", score: 7.9, reviews: 61 },
    ],
  },
]

export const popularSearches = ["北辰智造", "金融科技", "上海 AI", "加班波动", "薪资兑现"]

/** Current user — mirrors `apps/web/src/lib/mock-data.ts` `currentUser`. */
export const currentUser = {
  displayName: "指路人",
  username: "匿名评价者",
  trustLevel: 3,
  directionPoints: 1280,
  nextLevelPoints: 1500,
  streakDays: 7,
  helpedCount: 128,
  badges: ["第一次指路", "连续点灯 7 天", "高赞真实体验", "薪资贡献者", "面试观察员"],
}

export const reviews: MobileReview[] = [
  {
    id: "review-1",
    companyId: "northstar-tech",
    title: "节奏快，但工程氛围和同事协作比较稳定",
    content: "需求优先级确实会变化，但研发内部不是纯靠拍脑袋推进。Code Review 比较认真，线上问题也会复盘。建议面试时直接问试用期目标和绩效口径。",
    authorLabel: "离职员工",
    authorRole: "前端工程师",
    employmentStatus: "离职员工",
    city: "上海",
    directionScore: 7.8,
    usefulCount: 428,
    discussionCount: 31,
    createdAt: "5月12日",
    tags: ["研发流程清晰", "节奏偏快", "管理透明"],
    shortComment: "节奏快，但工程氛围和同事协作比较稳定",
    trustLevel: 4,
    verified: true,
    salaryRange: "25k-42k x 14",
  },
  {
    id: "review-7",
    companyId: "northstar-tech",
    title: "面试关注业务理解，不只是作品集表现",
    content: "设计面试会深入问业务目标、方案取舍和验证效果。流程三轮，HR、业务面、交叉面。团队更偏业务增长和 B 端复杂流程。",
    authorLabel: "面试者",
    authorRole: "设计师",
    employmentStatus: "面试者",
    city: "上海",
    directionScore: 7.0,
    usefulCount: 121,
    discussionCount: 9,
    createdAt: "5月10日",
    tags: ["面试体验", "业务理解", "团队节奏需确认"],
    shortComment: "面试关注业务理解，不只是作品集表现",
    trustLevel: 2,
    interviewRounds: "3 轮",
  },
  {
    id: "review-9",
    companyId: "lighthouse-media",
    title: "成长快是真的，消耗也是真的",
    content: "适合想快速接触商业化链路的人。大促或客户节点前需求会集中涌入，管理方式比较结果导向。",
    authorLabel: "在职员工",
    authorRole: "商业化产品",
    employmentStatus: "在职员工",
    city: "杭州",
    directionScore: 6.3,
    usefulCount: 138,
    discussionCount: 14,
    createdAt: "5月16日",
    tags: ["商业化", "成长快", "消耗明显"],
    shortComment: "成长快是真的，消耗也是真的",
    trustLevel: 3,
    salaryRange: "16k-28k x 13",
  },
  {
    id: "review-11",
    companyId: "river-finance",
    title: "流程偏重，但确定性不错",
    content: "金融科技业务流程多，但目标和边界清楚。薪资兑现稳定，年终和调薪沟通比较透明。",
    authorLabel: "在职员工",
    authorRole: "风控算法",
    employmentStatus: "在职员工",
    city: "深圳",
    directionScore: 8.2,
    usefulCount: 164,
    discussionCount: 11,
    createdAt: "5月17日",
    tags: ["薪资稳定", "合规流程", "边界清楚"],
    shortComment: "流程偏重，但确定性不错",
    trustLevel: 4,
    verified: true,
    salaryRange: "28k-50k x 15",
  },
  {
    id: "review-12",
    companyId: "river-finance",
    title: "面试轮次多，但每轮问题比较对岗",
    content: "技术面问高并发、数据一致性、线上排障和金融场景审计要求。流程等待时间偏长，但问题比较对岗。",
    authorLabel: "面试者",
    authorRole: "后端工程师",
    employmentStatus: "面试者",
    city: "深圳",
    directionScore: 7.4,
    usefulCount: 87,
    discussionCount: 6,
    createdAt: "5月11日",
    tags: ["面试轮次多", "问题对岗", "反馈偏慢"],
    shortComment: "面试轮次多，但每轮问题比较对岗",
    trustLevel: 2,
    interviewRounds: "4 轮",
  },
]

export const discussions: MobileDiscussion[] = [
  {
    id: "discussion-1",
    companyId: "northstar-tech",
    reviewId: "review-1",
    type: "追问",
    authorLabel: "匿名求职者",
    content: "想问下这个节奏快是整个公司都这样，还是主要集中在产品和研发？",
    usefulCount: 31,
    tags: ["加班", "团队差异"],
  },
  {
    id: "discussion-5",
    companyId: "northstar-tech",
    reviewId: "review-1",
    type: "追问",
    authorLabel: "匿名求职者",
    content: "想了解薪资兑现情况，绩效奖金会不会因为需求变化导致评价口径变掉？",
    usefulCount: 19,
    tags: ["薪资", "绩效"],
  },
  {
    id: "discussion-8",
    companyId: "northstar-tech",
    reviewId: "review-1",
    type: "补充",
    authorLabel: "匿名过来人",
    content: "节奏快主要看团队，新项目更忙，老业务线稳定很多。",
    usefulCount: 82,
    tags: ["高赞补充", "团队差异"],
  },
  {
    id: "discussion-11",
    companyId: "northstar-tech",
    reviewId: "review-7",
    type: "补充",
    authorLabel: "匿名过来人",
    content: "公开展示时涉及联系方式会自动打码，通勤和办公体验可以放心补充。",
    usefulCount: 21,
    tags: ["打码展示", "通勤"],
  },
]

export function getCompany(id: string) {
  return companies.find((company) => company.id === id) ?? companies[0]
}

export function getReview(id: string) {
  return reviews.find((review) => review.id === id) ?? reviews[0]
}

export function getCompanyReviews(companyId: string) {
  return reviews.filter((review) => review.companyId === companyId)
}

export function searchCompanies(query: string) {
  const q = query.trim()
  if (!q) return companies
  return companies.filter((company) =>
    [company.name, company.shortName, company.industry, company.city, ...company.roles, ...company.riskTags]
      .some((item) => item.includes(q))
  )
}

export function medianSalary(range: string) {
  const match = range.match(/(\d+)k-(\d+)k/i)
  if (!match) return range
  const median = Math.round((Number(match[1]) + Number(match[2])) / 2)
  const multiplier = range.match(/x\s*(\d+)/i)?.[1]
  return multiplier ? `${median}k x ${multiplier}` : `${median}k`
}

export function salaryInsights() {
  return companies
    .flatMap((company) =>
      company.roles.slice(0, 3).map((role, index) => ({
        company,
        role,
        range: company.salaryRange,
        median: medianSalary(company.salaryRange),
        score: Math.max(5.5, company.directionScore + (company.salaryRange.includes("50k") ? 0.5 : 0) - index * 0.18),
        samples: Math.max(12, Math.round(company.reviewCount / 18)),
      }))
    )
    .sort((a, b) => b.score - a.score)
}

export function interviewInsights() {
  return companies
    .map((company) => {
      const interview = reviews.find((review) => review.companyId === company.id && review.employmentStatus === "面试者")
      return {
        company,
        role: interview?.authorRole ?? company.roles[0],
        rounds: interview?.interviewRounds ?? (company.riskTags.some((tag) => tag.includes("面试")) ? "轮次较多" : "待补充"),
        score: interview?.directionScore ?? company.interviewScore,
        signal: interview?.title ?? "匿名面试流程样本正在补充。",
      }
    })
    .sort((a, b) => b.score - a.score)
}

export function opportunityInsights() {
  return companies
    .flatMap((company) =>
      company.roles.map((role, index) => ({
        company,
        role,
        fitScore: Number(Math.max(5.5, company.directionScore - index * 0.18).toFixed(1)),
        signal: company.highlights[index % company.highlights.length] ?? company.vibe,
      }))
    )
    .sort((a, b) => b.fitScore - a.fitScore)
}

export function benefitInsights() {
  return companies
    .map((company) => ({
      company,
      officeScore: company.officeScore,
      commuteScore: company.commuteScore,
      canteenScore: company.canteenScore,
      headline:
        company.officeScore >= 7.2
          ? "办公与配套体验稳定"
          : company.commuteScore >= 7.5
            ? "通勤便利度更突出"
            : "福利体验存在团队差异",
      signals: [
        `办公 ${company.officeScore.toFixed(1)}`,
        `通勤 ${company.commuteScore.toFixed(1)}`,
        `餐补/食堂 ${company.canteenScore.toFixed(1)}`,
      ],
    }))
    .sort((a, b) => (b.officeScore + b.commuteScore + b.canteenScore) - (a.officeScore + a.commuteScore + a.canteenScore))
}

export function communityInsights() {
  return discussions
    .map((discussion) => ({
      ...discussion,
      company: getCompany(discussion.companyId),
      review: discussion.reviewId ? getReview(discussion.reviewId) : undefined,
    }))
    .sort((a, b) => b.usefulCount - a.usefulCount)
}

export function companySnapshot(companyId: string) {
  const company = getCompany(companyId)
  const companyReviews = getCompanyReviews(companyId)
  const companyDiscussions = discussions.filter((discussion) => discussion.companyId === companyId)
  const interview = companyReviews.find((review) => review.employmentStatus === "面试者")

  return {
    salary: medianSalary(company.salaryRange),
    salarySamples: Math.max(12, Math.round(company.reviewCount / 18)),
    payScore: Number(Math.min(9, company.directionScore + (company.salaryRange.includes("50k") ? 0.3 : 0)).toFixed(1)),
    interview: interview?.interviewRounds ?? "待补充",
    interviewScore: Number((interview?.directionScore ?? company.interviewScore).toFixed(1)),
    interviewCount: companyReviews.filter((review) => review.employmentStatus === "面试者").length,
    roles: company.roles.length,
    topRole: company.roles[0] ?? "岗位样本待补充",
    benefits: Number(((company.officeScore + company.commuteScore + company.canteenScore) / 3).toFixed(1)),
    discussions: companyDiscussions.length,
  }
}

// ── Me page data (mirror of apps/web mock-data) ─────────────────────────

export type MobileDailyTask = {
  id: string
  title: string
  rewardPoints: number
  progress: number
  target: number
  completed: boolean
  href?: string
  hint?: string
}

export type MobileBadgeProgress = {
  id: string
  name: string
  description: string
  unlocked: boolean
  progress?: number
  target?: number
}

export const dailyTasks: MobileDailyTask[] = [
  {
    id: "view-company",
    title: "查看 1 家公司",
    rewardPoints: 5,
    progress: 1,
    target: 1,
    completed: true,
    href: "/rankings",
  },
  {
    id: "helpful-review",
    title: "给 1 条评价点有用",
    rewardPoints: 5,
    progress: 0,
    target: 1,
    completed: false,
    href: "/",
    hint: "在任意公司评价下点「有用」",
  },
  {
    id: "write-review",
    title: "匿名评价一家你熟悉的公司",
    rewardPoints: 20,
    progress: 0,
    target: 1,
    completed: false,
    href: "/submit",
    hint: "至少 30 字 + 通过匿名安全检查",
  },
  {
    id: "follow-company",
    title: "收藏 1 家你关注的公司",
    rewardPoints: 3,
    progress: 0,
    target: 1,
    completed: false,
    href: "/search",
    hint: "在公司详情页点 ☆ 收藏",
  },
  {
    id: "report-risk",
    title: "查看 1 条风险评价",
    rewardPoints: 3,
    progress: 0,
    target: 1,
    completed: false,
    href: "/community",
  },
]

export const badgeCatalog: MobileBadgeProgress[] = [
  { id: "first-light", name: "第一次点灯", description: "完成首次任意动作", unlocked: true },
  { id: "first-direction", name: "第一次指路", description: "发布第一条匿名评价", unlocked: true },
  {
    id: "streak-7",
    name: "连续点灯 7 天",
    description: "连续 7 天完成任意动作",
    unlocked: true,
    progress: 7,
    target: 7,
  },
  {
    id: "streak-30",
    name: "连续点灯 30 天",
    description: "连续 30 天",
    unlocked: false,
    progress: 7,
    target: 30,
  },
  { id: "helpful-author", name: "高赞真实体验", description: "单条评价有用数 ≥ 50", unlocked: true },
  { id: "salary-contrib", name: "薪资贡献者", description: "贡献 ≥ 3 条薪资区间", unlocked: true },
  { id: "interview-observer", name: "面试观察员", description: "贡献 ≥ 3 条面试体验", unlocked: true },
  {
    id: "risk-spotter",
    name: "避坑达人",
    description: "举报违规内容并被采纳 5 次",
    unlocked: false,
    progress: 1,
    target: 5,
  },
  {
    id: "trusted",
    name: "可信工友",
    description: "指路等级达到 L5",
    unlocked: false,
    progress: 3,
    target: 5,
  },
  { id: "veteran", name: "司南老用户", description: "注册满 1 年", unlocked: false, progress: 0, target: 1 },
]

/** Reviews authored by the current (mock) user — shown in /me. */
export function myReviews(): Array<MobileReview & { companyId: string; companyName: string }> {
  return companies.flatMap((company, companyIndex) =>
    companyIndex < 2
      ? getCompanyReviews(company.id).slice(0, 2).map((review) => ({
          ...review,
          companyId: company.id,
          companyName: company.shortName,
        }))
      : []
  )
}

/** Companies the mock user has favorited. Merged with AsyncStorage in /me. */
export const myFavoriteCompanies: Array<{ companyId: string; companyName: string; createdAt: string }> =
  companies.slice(0, 3).map((company, index) => ({
    companyId: company.id,
    companyName: company.shortName,
    createdAt: new Date(Date.now() - (index + 1) * 86_400_000 * 3).toISOString(),
  }))

/** Companies currently "claimed" in the prototype portal demo. */
export const claimedCompanyIds: string[] = ["northstar-tech", "polaris-auto"]
