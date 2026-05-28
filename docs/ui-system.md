# UI System

## Visual Direction

司南 uses a restrained C-end product style:

- Sinan Primary: `#12B981`, Primary Dark: `#047857`, Primary Soft: `#ECFDF5`.
- Ink: `#0F172A`, Ink Soft: `#1E293B`, Muted: `#64748B`.
- Background: `#F8FAFC`, Surface: `#FFFFFF`, Border: `#E2E8F0`.
- Risk: `#F97316`, Risk Soft: `#FFF7ED`, Risk Dark: `#C2410C`.
- Rounded but compact cards, with 8-16px radius depending on surface.
- Dense enough for decision-making, not a marketing-only landing page.

## Gamification Boundary

- 借鉴多邻国式机制：进度条、连续打卡、任务卡、奖励反馈、徽章、轻动效。
- 不复制多邻国视觉资产：角色、插画、布局、品牌色和文案都不复用。
- 游戏化只服务贡献反馈，不取代评论流。

## Core Product Surface

- 司南当前绝对核心是公司评价阅读区。
- 公司页不是报告页，而是公司主题下的匿名评价流。
- `ReviewCard` 是最重要的产品组件，必须优先保证可读性、信息密度和连续刷感。

## New Visual Texture

- 借鉴多邻国式圆润、明确反馈、轻游戏化机制。
- 使用司南自己的低饱和绿色品牌体系，不复制多邻国配色与资产。
- 局部使用毛玻璃（sticky 壳层、筛选容器、底部浮层、toast），评论正文保持实体白底确保可读性。

## Component Structure

```txt
src/components/
├── common/
├── layout/
├── company/
├── rating/
├── review/
├── gamification/
├── form/
└── ui/
```

`ui/` is shadcn-owned source code. Product components should live outside `ui/`.

## Product Language

- 综合评分: 方向分
- 用户积分: 方向值
- 连续签到: 连续点灯
- 用户等级: 指路等级
- 徽章: 司南徽章
- 热评: 高赞真实体验
- 差评: 低分体验 / 风险评价
- 推荐指数: 推荐入职率
- 评分分布: 方向分分布

## Avoided Language

Avoid 神评、黑公司、垃圾公司、曝光、挂人、撕、公开处刑 and similar attack or entertainment framing.

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

## 发布与问卷视觉收口（本轮）

- 发布评价 Step 1 增加“新增未收录公司”表单卡，沿用 SolidCard + SolidButton + solid 输入框。
- 新增公司表单升级为注册信息提交：必填公司名称、统一社会信用代码、注册地址、法定代表人、注册城市、所属行业。
- 新增公司提交后展示待审核状态卡，审核前不进入正式评价步骤。
- 全屏问卷主视觉保持“单题卡片”，状态信息降级为顶部轻量进度与底部弱提示。
- 发布链路按钮统一到 SolidButton，减少 shadcn 默认 outline/ghost 残留。

## P0 UI 收敛（新增）

- 新增公司表单与 CTA 沿用 solid 输入框 + `SolidButton`。
- 新增公司入口文案限定为 C 端流程语义：`还没有这家公司 / 新增这家公司 / 保存并继续评价`。
- 问卷场景继续保持“中央题卡主导”，不引入右侧大状态栏。
- 问卷完成态保留 `方向值 +8` 强反馈，避免在答题过程中堆叠冗余状态卡。

## 追问与补充 UI

- 追问与补充区继续使用 solid 视觉体系：SolidCard、SolidButton、TagPill。
- 输入区采用实体卡片和高对比输入框，避免评论区线框化或论坛噪音感。
- 追问 / 补充 badge 使用克制色彩区分，阅读内容优先。
