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

## 推荐流简化 + 结构化问卷 + C-BTI（本轮）

首页推荐卡改为短结构：推荐理由、公司基础信息、方向分、评价数、推荐率、关键评分、C-BTI、进入公司页。
首页不再展示长评价、适合/慎重、大量标签，推荐流目标回到“快速判断并进入公司页”。
发布评价新增“结构化问卷，可跳过”，用于补充评分和公司行为信号。
引入 C-BTI（Company Behavior Type Indicator）公司性格标签，并在首页推荐卡与公司页展示。
当前 C-BTI 由 mock 推断逻辑生成；真实 AI 分析接口见 `docs/ai-cbti-api.md`。

## 办公体验问卷补充（本轮）

结构化问卷新增“办公体验”分组：食堂、办公环境、厕所、下午茶、工位舒适度、通勤便利度、办公设备、办公体验指数。
办公体验字段为可选，不影响快速发布评价。
办公体验指数可作为公司日常体验辅助判断，也可作为 C-BTI AI 分析辅助输入，但不直接决定 C-BTI。
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
