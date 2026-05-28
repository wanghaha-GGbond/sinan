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

## Round Update: 推荐卡简化 + 结构化问卷 + 公司体感标签

- 首页推荐卡改为短结构：推荐理由、公司基础信息、方向分、评价数、推荐率、关键评分、公司体感标签、进入公司页。
- 首页不再展示长评价、适合/慎重、大量标签，推荐流目标回到“快速判断并进入公司页”。
- 发布评价新增“结构化问卷，可跳过”，用于补充评分和公司行为信号。
- 前台主展示改为“公司体感标签”，例如仓鼠笼公司、火箭发射台公司、温水鱼缸公司。
- C-BTI（Company Behavior Type Indicator）保留为内部结构字段，不再作为前台主品牌展示。
- 当前体感标签由 mock 推断逻辑生成；真实 AI 分析接口见 `docs/ai-cbti-api.md`。

## Round Update: 办公体验问卷补充

- 结构化问卷新增办公体验分组（食堂、环境、厕所、下午茶、工位、通勤、设备、办公体验指数）。
- 办公体验字段默认可跳过，不阻断快速评价路径。
- 办公体验作为公司体感 / C-BTI 辅助信号输入，不直接决定 C-BTI 主类型。
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

## Round Update: 社区共建公司库 + 注册信息审核

- 公司库采用社区共建模式，真实经历者可以提交未收录公司。
- 添加公司需要提交注册信息：公司名称、统一社会信用代码、注册地址、法定代表人、注册城市、所属行业。
- 新增公司默认 `source=user_added`、`pendingReview=true`、`reviewStatus=pending_review`、`claimedStatus=unclaimed`。
- `reviewStatus=reviewable` 后才开放正式评价；当前不接真实后端，不做审核后台。
- `pending_review` 仅提交者本地可见，不进入全站推荐；`rejected` 不可评价。
- 前端新增重复公司提示、统一社会信用代码基础校验、敏感信息与攻击性表达过滤。
- 新增公司不是企业入驻，不产生企业账号，不赋予企业控评能力。

## 评价详情页社区化能力

- 已在评价详情页接入“追问与补充”，作为求职者互助社区的第一层互动能力。
- 当前范围只覆盖单条评价下的追问、补充、本地发布、本地有用反馈和基础内容安全过滤。
- 暂不做真实后端、登录、通知、企业回复、多级嵌套评论和审核后台。

## 追问与补充后续接入计划

- 前端已建立追问与补充的排序权重、审核状态、本地草稿和 API contract。
- 后续接真实后端时，需要把本地 `pendingSync` 映射为服务端审核状态，并补充用户身份、审核队列和通知机制。
- 当前仍不做企业回复、多级嵌套、私信和审核后台。

## Discussion Moderation 设计边界

- 真实 API 接入前，前端已模拟 discussion moderation 状态机和可见性规则。
- 下一阶段如果接服务端，POST 后应默认进入 pending_review，由服务端审核决定 visible / limited_visible / rejected。
- 企业不具备 moderation 权限，不进入审核链路。
