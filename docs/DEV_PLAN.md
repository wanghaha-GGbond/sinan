# 司南 (Sinan) 开发计划 v2.0 · Sprint 级任务拆解

> 本文档是 [07-roadmap.md](07-roadmap.md) 的执行级细化。v1.0（S0-S10，覆盖 M0-M2）已于 2026-06-13 全部交付。
> v2.0 覆盖 M3（功能化拍卖 + 圈层 + 私聊 + P1）+ Web 端完善 + 测试补全。
> iOS 端暂搁置，待 Web 端稳定后再追齐。
>
> 节奏假设：1 名全栈，2 周一个 Sprint。

---

## 已完成（v1.0 交付，2026-06-13）

| Sprint | 阶段 | 主题 | 状态 |
|---|---|---|---|
| S0 | 收尾 | 提交在途工作、修验证表外键、收导航 | ✅ |
| S1-S2 | M0a | 真·三级验证：L1 邮箱验证码闭环、L2 审核后台、trustLevel 联动 | ✅ |
| S3-S4 | M0b | 身份卡 + 邀请制：卡面组件(4级材质)、邀请码注册、/u/[id] 用户主页 | ✅ |
| S5-S6 | M1a | 部门级评价：departments 表、五维评分、k-匿名规则引擎 | ✅ |
| S7-S8 | M1b | 违约库 + 情绪指数：promise_records(先审后发)、周 K 聚合、/press hub | ✅ |
| S9-S10 | M2 | 引爆支撑：拍卖运营页、行情榜、邀请落地页、指标看板 | ✅ |

已交付：41 页面、52 API 路由、54 组件、14 DB 迁移、23 schema 文件。TS 检查 + Metro 打包全过。

---

## 总览（v2.0 — Sprint 11-16）

| Sprint | 阶段 | 主题 | 核心交付 |
|---|---|---|---|
| S11 | M3a | 拍卖功能化收尾 | 前端交互闭环、嘉宾管理页、结算通知 |
| S12 | M3b | 圈层 + 私聊前端 | 圈层浏览/加入/背书、私聊 inbox/thread/请求队列前端 |
| S13 | M3c | P1 前端完善 | 高光馆/一技封神/感谢信漂流前端完整化 |
| S14 | M3d | 测试补全 | 单元测试覆盖 server libs、E2E 覆盖核心用户路径 |
| S15 | M3e | 性能 + 质量 | 去 mock data、SQL 查询优化、错误边界、a11y |
| S16 | M3f | 收尾 + iOS 规划 | bug bash、文档同步、iOS 追齐计划 |

---

## Sprint 11：拍卖功能化收尾（M3a）

**现状**：拍卖 schema + 状态机引擎(386行) + 行情榜已就绪，API routes (
POST /api/auctions, bids, heart-pick, transition, settle) 骨架已有。
前端有 `/auction` 列表页 + `/[id]` 详情页 + `/[id]/manage` 管理页。

### T11.1 拍卖前端交互闭环
- `/auction/[id]/page.tsx`：实时出价 UI（盲拍模式，金额隐藏）、倒计时、心动权公示
- `/auction/[id]/manage/page.tsx`：嘉宾操作面板（行使心动权/默认成交）、bidder 列表
- 结算结果展示：中标通知、未中标公示、收据链接
- 所有操作需 auth gate（trustLevel ≥ 1 可出价）

### T11.2 拍卖列表完善
- `/auction/page.tsx`：live/upcoming/settled 三 tab 筛选
- 每张 auction 卡片显示：场景标题、嘉宾段位、倒计时/已结束、出价人数

### T11.3 通知
- 拍卖结算后给中标者 + 嘉宾发站内通知（复用现有 toast 即可）

**S11 验收**：从浏览列表 → 出价 → 嘉宾选标 → 结算 全流程可走通。

---

## Sprint 12：圈层 + 私聊前端（M3b）

**现状**：circles/dm schema + API routes 骨架已有。前端 `/circles` 列表页 + `/circles/[id]` 详情页、
`/me/inbox` 私聊列表 + `/[threadId]` 对话页已有骨架。

### T12.1 圈层前端
- `/circles`：3 个首批圈层（总监圈/出海圈/大模型圈）卡片展示 + trustLevel 门槛标识
- `/circles/[id]`：成员列表 + 加入按钮（需背书人，已有 API）
- 成员 card 显示段位 + 身份卡缩略图

### T12.2 私聊前端
- `/me/inbox`：thread 列表（最后消息预览、未读标记）
- `/me/inbox/[threadId]`：消息流 + 发送框
- 段位差 ≥ 2 时自动走请求队列：`/me/requests-outgoing` 查看已发出请求
- 收到请求的处理：inbox 中显示 pending requests，accept/reject

### T12.3 DM 请求队列 UI
- 被请求方收到通知
- `/me/inbox` 顶部显示 pending DM requests
- accept → 自动创建 thread、reject → 可选附原因

**S12 验收**：圈层可浏览/加入/查看成员；私聊走通 直接开 thread 和请求队列两条路径。

---

## Sprint 13：P1 前端完善（M3c）

**现状**：高光馆(`/highlights`)、一技封神(`/skills`、`/me/skills`)、感谢信漂流(`/gratitude`)
页面骨架已有，API routes 就绪。

### T13.1 高光馆
- `/highlights`：已审核通过的 highlights 流
- `/me/highlights`：我的高光时刻管理（提交/查看审核状态）
- 提交表单：140 字高光内容 + 提交审核

### T13.2 一技封神
- `/skills`：技能广场（按 endorser 数排序）
- `/me/skills`：我的技能管理（提交新技能/查看背书数）
- 背书交互：在技能详情页点「背书」→ endorserCount +1

### T13.3 感谢信漂流
- `/gratitude`：公开感谢信墙（匿名/实名 toggle）
- 提交表单：收信人选择 + 内容
- 12 小时同人限 1 封的提示

**S13 验收**：三个 P1 功能均可走通提交 → 展示全流程。

---

## Sprint 14：测试补全（M3d）

**现状**：24 个单元测试全过（拍卖状态机 6 + 匿名规则 2 + DM 引擎 8 + 圈层 8）。
E2E 测试(`sinan.spec.ts`)存在但未跑通。

### T14.1 server lib 单元测试
- `auction-engine.ts`：补充 settleByHighestBid / heartPick 事务模拟测试
- `dm-engine.ts`：补充 thread 创建/消息发送的纯函数测试
- `invites.ts`：邀请码核销/返还逻辑测试
- `verification.ts`：approveVerification + trustLevel 联动测试
- `anonymity.ts`：补充边缘 case（跨状态评价、部门归并降级）

### T14.2 E2E 核心路径
- 注册 → L1 验证 → trustLevel=1 全流程
- 写评价 → 提交五维分 → 公司页展示
- 评论流：展开/收起/回复/点赞
- 拍卖：浏览 → 出价 → 嘉宾选标 → 结算
- DM：直接消息 + 请求队列两条路径

### T14.3 测试基础设施
- `package.json` 加 `"test": "playwright test"` + `"test:unit": "tsx --test tests/*.spec.ts"`
- CI 文件（`.github/workflows/test.yml`）最小可跑版本

**S14 验收**：server lib 覆盖 ≥ 80%；E2E 覆盖 5 条核心路径且全绿。

---

## Sprint 15：性能 + 质量（M3e）

### T15.1 去 mock data
- `review-discussion-section.tsx`：`createLocalDiscussion` → 真实 API 调用
- `company-review-feed.tsx`：mock reviews → 数据库查询
- 搜索页：mock results → `/api/companies/search`

### T15.2 SQL 查询优化
- 公司页 review 聚合：加物化视图或缓存层（当前实时 SQL 聚合，量大扛不住）
- 行情榜：加 Redis 缓存（当前每次查全表）
- 讨论列表 N+1：批量加载 author profiles

### T15.3 错误边界 + a11y
- 每个 page 加 `error.tsx`（当前部分页面缺失）
- 每个 page 加 `loading.tsx`（骨架屏，不用 spinner）
- 表单 focus 顺序、键盘导航

**S15 验收**：所有页面数据来自真实 API；公司页首屏 < 500ms（本地 DB）；无 console error。

---

## Sprint 16：收尾 + iOS 规划（M3f）

### T16.1 bug bash
- 全站走查：auth 流程、评论交互、拍卖状态迁移、DM 请求队列
- 移动端响应式检查（< 780px 单栏）
- 暗色模式兼容

### T16.2 文档同步
- DEV_PLAN.md ↔ 实际代码一致
- API routes 文档（给 iOS 端参考）
- README.md 更新：本地开发/测试/部署指令

### T16.3 iOS 追齐计划
- 评估 iOS 当前差距（清单：拍卖/圈层/私聊/高光馆/技能/感谢信/违约库）
- 输出 iOS Sprint 计划文档（S17-S20），等 Web 稳定后启动

**S16 验收**：Web 端 0 已知 bug；DEV_PLAN 与代码一致；iOS 追齐计划就绪。

---

## 贯穿全程的规则（v2.0 不变）

1. **k-匿名与法务红线**：任何新展示面过 `lib/server/anonymity.ts`，不允许绕过。
2. **审核优先于自动可见**：违约库、身份卡敏感字段、高光时刻一律先审后发。
3. **PIPL 最小化**：验证原件审完即删、薪资类信息不碰、敏感字段问一句"能不能不存"。
4. **遵守仓库规约**：写代码前先读 `node_modules/next/dist/docs/` 对应章节。
5. **Web 优先**：iOS 暂不跟进新功能，待 Web 端全部验收通过后再启动追齐。

## 明确不做（v2.0 scope boundary）

- iOS 追齐（S16 只出计划，不写代码）
- 支付通道 / 个税代扣 / 经营性 ICP（M4 法务通过后再补）
- NLP 情感分析（评分代理够用）
- BI 系统（SQL + admin 页够用）
- L3 薪资验证（PIPL 红线，M4 评估）
