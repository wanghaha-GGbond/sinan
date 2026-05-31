# Codex Agent Prompt：司南项目初始化与公司评分页设计

你是「司南」项目的产品工程 Agent。

你的任务不是单纯写代码，而是作为一个具备产品、前端、后端、交互、数据建模能力的工程 Agent，帮助我从 0 到 1 搭建一个现代 Web 产品原型。

请严格按照以下要求执行。

---

# 1. 项目基本信息

项目名称：司南

Slogan：入职前，先看清方向。

产品定位：

司南是一个面向 C 端打工人的匿名公司评分、公司评价、面试体验、薪资区间与入职避坑平台。

用户可以在司南上：

- 搜索公司；
- 查看公司评分；
- 查看公司真实评价；
- 匿名发布公司评价；
- 查看面试体验；
- 查看薪资区间；
- 查看公司风险标签；
- 给公司打方向分；
- 给评价点赞“有用”；
- 通过贡献评价获得方向值、徽章、连续点灯等游戏化反馈。

司南不是招聘平台。

司南不是企业雇主品牌平台。

司南不是 B 端 SaaS。

司南的核心用户是 C 端打工人，通过每个职场人以及求职者对公司进行打分来建立一个工作者的社区。

---

# 2. 核心产品原则

请始终遵守以下原则：

1. C 端优先。
2. 公司端弱权限。
3. 匿名保护优先。
4. 评价真实性优先。
5. 前端体验优先。
6. 移动端优先。
7. 现代 UI 优先。
8. 不做传统招聘网站风格。
9. 不做企业后台风格。
10. 不在 MVP 阶段做 Web3、代币、DAO、空投。
11. 不允许企业删差评、改评分、买排名。
12. 不允许暴露匿名用户身份。

---

# 3. 公司端权限边界

公司账号只能：

- 查看自己公司的公开评分；
- 查看自己公司的评分趋势；
- 查看自己公司的标签分布；
- 查看公开评价；
- 提交公司基础信息修正申请；
- 对明显违规内容提交申诉。

公司账号不能：

- 删除评价；
- 修改评分；
- 购买排名；
- 购买好评；
- 获取评价用户身份；
- 查看评价用户手机号；
- 查看评价用户邮箱；
- 查看评价用户 IP；
- 查看评价用户设备信息；
- 私信评价用户；
- 影响榜单排序；
- 控制评价展示。

产品底线：

公司只能看见镜子，不能控制镜子。

---

# 4. UI 风格要求

司南的 UI 要现代、轻量、卡片化、游戏化、移动端优先。

请参考以下风格方向，但不要复制任何现有产品视觉资产：

- 多邻国式的游戏化机制；
- 虎扑式的社区评分参与感；
- 现代消费级 App 的卡片式 UI；
- Notion / Linear / Arc 这类现代产品的干净信息层级；
- 小红书 / 即刻这类社区产品的信息流轻互动感。

注意：

可以借鉴机制，不可以复制皮肤。

---

# 5. 司南自己的产品语言

请使用司南自己的产品语言，不要照搬其他平台话术。

通用概念映射如下：

- 综合评分：方向分
- 用户积分：方向值
- 连续签到：连续点灯
- 用户等级：指路等级
- 徽章：司南徽章
- 热评：高赞真实体验
- 神评：不要使用这个词
- 差评：风险评价 / 低分体验
- 公司评分页：方向评分页
- 推荐指数：推荐入职率
- 避坑标签：风险标签
- 评分分布：方向分分布

---

# 6. 公司评分页重点要求

这是本项目最重要的页面之一。

我要做一个公司评价页，可以学习虎扑那种「大家都能打分、短评、分数分布、热评、社区共识」的机制。

但不能太虎扑。

它必须有司南自己的感觉。

也就是说：

- 不要做成体育、娱乐、影视评分风格；
- 不要复制虎扑 UI；
- 不要复制虎扑话术；
- 不要鼓励网暴；
- 不要把公司评价做成纯情绪宣泄；
- 不要用“神评”这种娱乐化表达；
- 不要让低分评价变成攻击公司或个人。

司南的评分页应该是：

- 更克制；
- 更现代；
- 更有职业决策感；
- 更重视匿名安全；
- 更重视评价可信度；
- 更强调“后来者有用”；
- 更强调“看清方向”。

---

# 7. 公司评分页必须包含的模块

请为 `/company/[id]/ratings` 设计并实现一个完整页面。

页面必须包含以下模块：

## 7.1 公司评分头部

展示：

- 公司名称；
- 行业；
- 城市；
- 公司规模；
- 方向分；
- 评价人数；
- 推荐入职率；
- 最近更新时间；
- 近期评分趋势。

示例文案：

深空机器人  
方向分 7.6 / 10  
236 位打工人评价  
推荐入职率 61%  
近 30 天下降 0.3

---

## 7.2 方向分大数字

用大数字展示公司方向分。

示例：

7.6  
方向分

来自 236 位打工人的真实评价。

分数解释：

- 9.0 - 10：强烈推荐，较少明显风险；
- 8.0 - 8.9：整体较好，适合重点考虑；
- 7.0 - 7.9：可以考虑，但需要看具体岗位；
- 6.0 - 6.9：机会与风险并存；
- 5.0 - 5.9：不确定性较高；
- 4.0 - 4.9：风险较明显；
- 0 - 3.9：高风险，建议谨慎。

---

## 7.3 用户打分入口

设计一个 0-10 分的打分器。

标题：

你会给这家公司几分？

按钮：

0 1 2 3 4 5 6 7 8 9 10

用户选择分数后，出现一句话短评输入框。

提示文案：

用一句话告诉后来者：这家公司适合什么人？不适合什么人？

示例 placeholder：

适合想快速成长的人，但不适合追求稳定和边界感的人。

---

## 7.4 分数分布

展示 0-10 分的评分分布。

示例：

10 分：18%  
9 分：13%  
8 分：22%  
7 分：16%  
6 分：10%  
5 分：8%  
4 分：5%  
3 分：4%  
2 分：2%  
1 分：1%  
0 分：1%

需要用横向进度条可视化。

---

## 7.5 分维度评分

展示以下维度：

- 薪资福利；
- 工作生活平衡；
- 管理水平；
- 成长空间；
- 团队氛围；
- 稳定性；
- 诚信度。

注意：

后台可以记录工作强度，但前台不要直接展示“工作强度越高越好”。

前台应该展示成“工作生活平衡”。

---

## 7.6 司南短评区

短评卡片字段：

- 用户匿名身份；
- 打分；
- 一句话短评；
- 岗位方向；
- 城市；
- 工作状态；
- 可信等级；
- 有用数；
- 发布时间。

短评示例：

7 分｜适合想快速成长的工程师，但节奏很快，抗压能力不强的人慎重。

5 分｜项目不错，但管理混乱，入职前一定要问清楚直属领导和团队方向。

8 分｜薪资有竞争力，技术氛围不错，缺点是流程变化比较快。

---

## 7.7 高赞真实体验

不要叫“热评”。

不要叫“神评”。

叫：

高赞真实体验

排序逻辑：

- 有用数；
- 内容质量；
- 用户可信等级；
- 时间衰减；
- 举报风险。

展示字段：

- 评分；
- 短评；
- 真实体验正文；
- 岗位方向；
- 工作状态；
- 可信等级；
- 有用数；
- 举报按钮。

---

## 7.8 低分原因聚合

如果公司存在大量低分评价，需要结构化展示低分原因。

示例：

低分主要原因：

1. 加班严重：43 次提及
2. 管理混乱：31 次提及
3. 薪资承诺不一致：18 次提及
4. 流程拖拉：15 次提及

---

## 7.9 推荐理由聚合

展示高分评价中最常出现的推荐理由。

示例：

推荐理由：

1. 技术氛围好：52 次提及
2. 薪资有竞争力：47 次提及
3. 成长快：38 次提及
4. 团队年轻：24 次提及

---

## 7.10 我的打分状态

如果用户没打分：

你还没有给这家公司指过方向。

按钮：

给这家公司打分

如果用户已打分：

你给这家公司打了 7 分。  
你的评价正在帮助 18 位后来者。

---

# 8. 评价发布流程

请为 `/submit/review` 设计一个分步式表单。

不要一次性展示超长表单。

流程如下：

1. 选择公司；
2. 选择身份；
3. 打方向分；
4. 填写分维度评分；
5. 写一句话短评；
6. 补充真实体验；
7. 选择标签；
8. 补充薪资，可跳过；
9. 匿名安全检查；
10. 提交成功。

---

# 9. 发布评价字段

评价字段包括：

- companyId；
- employmentStatus；
- jobCategory；
- city；
- workPeriod；
- ratingOverall；
- ratingSalary；
- ratingWorklife；
- ratingManagement；
- ratingGrowth；
- ratingCulture；
- ratingStability；
- ratingIntegrity；
- recommendScore；
- shortComment；
- pros；
- cons；
- advice；
- salaryRange；
- overtimeStatus；
- resignationReason；
- selectedTags；
- isAnonymous。

---

# 10. 匿名安全检查

提交前必须展示匿名安全检查。

文案：

发布前请确认：

1. 没有出现真实姓名；
2. 没有出现手机号、邮箱、住址；
3. 没有出现直属领导姓名；
4. 没有上传公司内部文件；
5. 没有泄露商业秘密；
6. 内容基于你的真实经历或合理主观感受。

---

# 11. 禁止内容

评价内容禁止：

- 人身攻击；
- 泄露个人隐私；
- 泄露商业秘密；
- 恶意造谣；
- 捏造违法事实；
- 煽动网暴；
- 公开领导姓名和联系方式；
- 上传内部文件；
- AI 批量垃圾内容；
- 竞品恶意刷评；
- 公司控评。

---

# 12. 游戏化系统

请在产品中设计基础游戏化系统。

包括：

## 12.1 方向值

方向值是用户贡献积分。

获取方式：

- 发布高质量公司评价：+20；
- 发布面试体验：+10；
- 提交薪资区间：+15；
- 评价被认为有用：+2；
- 举报违规内容成功：+10；
- 连续点灯：+5；
- 完成身份验证：+30；
- 恶意刷评：-50；
- 内容违规：-20。

## 12.2 连续点灯

用户每日完成任意动作即可点灯：

- 查看一家公司；
- 收藏一家公司；
- 发布一条评价；
- 给一条评价点有用；
- 完成一个今日任务；
- 举报违规内容。

## 12.3 徽章

徽章包括：

- 新手指路人；
- 第一次点灯；
- 面试观察员；
- 薪资贡献者；
- 避坑达人；
- 可信工友；
- 司南老用户。

---

# 13. MVP 页面范围

请先实现前端 MVP 原型。

必须包含以下页面：

- `/` 首页；
- `/search` 搜索页；
- `/company/[id]` 公司详情页；
- `/company/[id]/ratings` 公司方向评分页；
- `/company/[id]/reviews` 公司评价列表页；
- `/submit/review` 发布评价页；
- `/rankings` 榜单页；
- `/me` 我的页面。

---

# 14. 必须创建的组件

请创建以下组件：

## 通用组件

- Button
- Card
- Input
- SearchBar
- Tabs
- Badge
- Avatar
- Modal
- Toast
- ProgressBar
- Stepper
- EmptyState
- LoadingState
- ErrorState

## 公司组件

- CompanyCard
- CompanyHeader
- CompanyScoreCard
- CompanyRadarChart
- CompanyTagCloud
- CompanyReasonCluster

## 评分组件

- ScoreSelector
- RatingDistribution
- RatingDimensionCard
- DirectionScoreHero
- MyRatingStatus

## 评价组件

- ShortCommentCard
- ReviewCard
- HotReviewCard
- SubmitReviewStepper

## 游戏化组件

- TaskCard
- AchievementBadge
- StreakCard
- DirectionPointsCard

---

# 15. TypeScript 类型

请定义以下核心类型：

```ts
type User = {
  id: string;
  username: string;
  avatarUrl?: string;
  role: "user" | "company" | "admin";
  trustLevel: number;
  directionPoints: number;
  streakDays: number;
};

type Company = {
  id: string;
  name: string;
  alias?: string[];
  englishName?: string;
  industry: string;
  city: string;
  size?: string;
  financingStage?: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  claimedStatus: "unclaimed" | "claimed";
};

type Review = {
  id: string;
  companyId: string;
  userIdHash: string;
  employmentStatus: "current" | "former" | "interviewed" | "intern" | "contractor" | "other";
  jobCategory: string;
  city: string;
  workPeriod?: string;
  ratingOverall: number;
  ratingSalary: number;
  ratingWorklife: number;
  ratingManagement: number;
  ratingGrowth: number;
  ratingCulture: number;
  ratingStability: number;
  ratingIntegrity: number;
  recommendScore: number;
  shortComment: string;
  pros?: string;
  cons?: string;
  advice?: string;
  salaryRange?: string;
  overtimeStatus?: string;
  resignationReason?: string;
  verificationLevel: "none" | "basic" | "company_email" | "document";
  qualityScore: number;
  riskScore: number;
  usefulCount: number;
  reportCount: number;
  status: "pending" | "approved" | "rejected" | "masked" | "limited" | "disputed" | "removed";
  createdAt: string;
};

type RatingDistribution = {
  companyId: string;
  scores: {
    score: number;
    count: number;
    percentage: number;
  }[];
};

type CompanyScoreSnapshot = {
  companyId: string;
  scoreOverall: number;
  scoreSalary: number;
  scoreWorklife: number;
  scoreManagement: number;
  scoreGrowth: number;
  scoreCulture: number;
  scoreStability: number;
  scoreIntegrity: number;
  recommendRate: number;
  reviewCount: number;
  verifiedReviewCount: number;
  updatedAt: string;
};

type Tag = {
  id: string;
  name: string;
  type: "positive" | "risk" | "neutral";
  sentiment: "positive" | "negative" | "neutral";
};
