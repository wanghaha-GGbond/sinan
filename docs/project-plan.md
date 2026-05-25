# Project Plan

## MVP Scope

Completed in the current frontend prototype:

- Home page
- Company search
- Company detail
- Company rating page
- Company reviews
- Review detail page (`/company/[id]/reviews/[reviewId]`)
- Submit review flow
- Rankings
- Me page
- Mock data and API contract
- Playwright e2e tests

## Current Focus

Product-level direction after round 3:

- 公司评价阅读区是 PMF 核心。
- 评论流优先。
- Company pages should feel like company-specific lightweight communities.
- Direction score remains visible but must not overpower reviews.
- Reduce platform-generated summary modules.
- Reduce repeated buttons and CTAs.
- Keep anonymous safety and C-end reading experience.
- Add light gamification for contribution feedback only:
  - 方向值
  - 连续点灯
  - 今日指路任务
  - 司南徽章
- Review loop: feed -> detail -> useful feedback -> back to feed
- 阅读闭环关键交互：有用、展开、详情、上一条/下一条。

## Next Backend Phase

Out of scope for this frontend MVP, but implied by `docs/api-contract.md`:

- Anonymous identity protection
- Review moderation pipeline
- Company/rating/review APIs
- Anti-abuse and rate limiting
- Content safety review

## Non-Goals

- Web3
- Token
- DAO
- Wallet login
- Airdrop
- Enterprise score manipulation or review deletion

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

## Round Update: 推荐卡简化 + 结构化问卷 + C-BTI

- 首页推荐卡改为短结构：推荐理由、公司基础信息、方向分、评价数、推荐率、关键评分、C-BTI、进入公司页。
- 首页不再展示长评价、适合/慎重、大量标签，推荐流目标回到“快速判断并进入公司页”。
- 发布评价新增“结构化问卷，可跳过”，用于补充评分和公司行为信号。
- 引入 C-BTI（Company Behavior Type Indicator）公司性格标签，并在首页推荐卡与公司页展示。
- 当前 C-BTI 由 mock 推断逻辑生成；真实 AI 分析接口见 `docs/ai-cbti-api.md`。

## Round Update: 办公体验问卷补充

- 结构化问卷新增办公体验分组（食堂、环境、厕所、下午茶、工位、通勤、设备、办公体验指数）。
- 办公体验字段默认可跳过，不阻断快速评价路径。
- 办公体验作为 C-BTI 辅助信号输入，不直接决定公司性格主类型。
- 首页/公司页仅轻量展示办公体验指数，保持阅读区主导。

## Round Update: 新增公司 + 问卷降噪 + 按钮统一

- 发布评价 Step 1 支持“搜索已有公司 / 新增未收录公司”。
- 新增公司仅走本地 mock 状态，默认 `pendingReview`、`unclaimed`。
- 全屏问卷强调单题答题主路径，状态信息降级为顶部轻量进度。
- 发布链路按钮统一迁移到 SolidButton 体系。

## P0 补丁范围（新增）

- 新增未收录公司：补齐 `companyId` 绑定与默认状态字段（`unclaimed` / `pendingReview` / `user_added`）。
- 问卷行为修正：最后一题支持“答完或跳过后进入完成页”，完成后回传 `ReviewQuestionnaire`。
- 发布链路回归：补充“已有公司 / 新增公司 + 有问卷 / 无问卷”的端到端回归用例。
- 关键按钮 solid 化：发布页、公司页、详情页、评分页主 CTA 持续替换为 `SolidButton`。
