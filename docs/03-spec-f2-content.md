# 03 · F2 部门级评价 + 职业违约库 + 情绪指数 Spec

> 内容护城河。代码现状：评价 + 审核管线 + 举报 + 讨论 + 公司申诉/纠错全套已有（这是最大存量资产），
> 但部门只是自由文本 `reviews.department_hint`，五维评分散在 `questionnaire` jsonb 中无规范 schema；
> 违约库与情绪指数完全没有。

## 1. 部门级评价

### 1.1 departments 表（新增）

```
departments
  id, company_id (FK), name, alias_names (jsonb), status (active/merged/hidden),
  merged_into_id (FK departments, nullable), created_at
```

- 部门由运营预置（Top 20 种子公司先行）+ 用户申报（「找不到我的部门」→ 进审核队列建新部门）。
- 部门合并：组织调整后用 `merged_into_id` 软合并，历史评价跟随展示。
- `reviews` 加 `department_id`（nullable FK）；存量 `department_hint` 保留，运营后台逐步归一。

### 1.2 五维评分（结构化，法律风险的第一道闸）

固定 schema（zod 定义放 `lib/types.ts`，提交与展示共用）：

| 维度 key | 名称 | 说明 |
|---|---|---|
| `pay_worth` | 钱给得值不值 | 不是绝对薪资，是性价比 |
| `growth` | 成长 | |
| `leader` | leader | **部门聚合分，永不到人**（见 01 §三） |
| `overtime_truth` | 加班真相 | |
| `promise_delivery` | 画饼兑现率 | 与违约库联动展示 |

- 1-5 分，五维必填；写入 `reviews.questionnaire`（jsonb 按 schema 校验），`api/reviews/route.ts` 与 `app/submit/review/page.tsx` 同步改。
- 聚合：按公司 / 按部门的五维均分 + 样本数，先实时 SQL（`lib/server/company-view.ts`），量大再物化。
- **评价全部结构化打分 + 事实条目，自由文本走现有审核状态机严审**——这是名誉权诉讼的主要防线（08 §1）。

### 1.3 公司页部门 tab

- `app/company/[id]/page.tsx`：部门 tab + 五维雷达/条形图 + 该部门评价流。
- **k-匿名降级**：部门内 trustLevel≥1 的发布者 <5 人时，该部门评价归并到公司级展示，tab 显示「样本不足，暂以公司维度展示」；段位标签同步模糊（「某 L7」→「某高 P」）。规则唯一入口 `lib/server/anonymity.ts`，任何新展示面必须过它（08 §2）。
- 匿名但带段位：「某 L7 验证用户」，渲染走 `anonymous_profiles`（已有）。

## 2. 职业违约库

> 全产品法律风险最高的功能，按最严标准设计。差异化价值：把「画饼」从情绪输出变成结构化对照证据。

### 2.1 数据模型（新增）

```
promise_records
  id, company_id (FK), department_id (FK, nullable),
  author_user_id (FK), anonymous_profile_id (FK),
  promise_text        -- 承诺内容（结构化短文本，限 200 字）
  promise_date        -- 承诺时间（年月）
  promise_context     -- 场景枚举: offer谈判/晋升答辩/全员会/1on1/招聘JD/其他
  outcome_status      -- kept / partial / broken
  outcome_text        -- 实际情况（限 200 字）
  evidence_note       -- 证据描述 + 证据指纹哈希（不存原件，见 2.3）
  status              -- 复用 review 状态机枚举
  moderation_reason, created_at, reviewed_at, ...
```

### 2.2 规则

- **发布门槛 trustLevel ≥ 2**（API 层硬校验）——发布成本本身是防水军机制。
- **全人工先审后发**：不同于普通评价的部分自动可见；新增 `api/moderation/promise-records` 队列（仿 review-reports 模式）。
- 展示为「承诺 vs 兑现」对照条目，**无自由长文本直出**；公司页五维中的 `promise_delivery` 分数与违约库条目互相引用。
- 被诉处理与公司申诉通道：复用现有 `company_appeals`（已有表与枚举），流程见 08 §1。

### 2.3 证据留存策略

- 平台**不存证据原件**（聊天记录 / 邮件截图等含大量第三方个人信息，存储即风险）。
- 用户上传原件仅供审核查验，审核后即删；系统保留：证据类型描述 + 文件 SHA-256 指纹 + 审核人结论。
- 用户被告知自行保留原件；若进入诉讼，指纹可证明「审核时存在该证据且未被篡改」。

## 3. 情绪指数

> 最强传播截图素材。设计约束：冷启动期数据稀疏，**日 K 画不出来**（50 家公司每天没几条新内容，
> 日 K 是一条横线偶尔跳点，截图反而暴露平台没人）。决议：**周 K 起步 + 事件标注**，密度达标后切日 K。

### 3.1 计算（v1：评分代理，不接 NLP）

```
company_sentiment_daily
  company_id, date, score, sample_count, components (jsonb)
```

- 每日聚合 job（Vercel Cron → `api/cron/sentiment`，带 secret 校验）。
- v1 公式（可解释、不烧钱）：
  `score = 0.6 × 当日新评价五维均分(归一化) + 0.25 × 发帖热度(对数) + 0.15 × useful_count 增量(对数)`
  ；无新数据日沿用前值衰减（×0.98 向中性回归），`sample_count` 如实记录。
- 切日 K 条件：单公司连续 30 天日均新内容 ≥5 条。
- v2（M3+）再评估接情感分析；v1 的 `components` jsonb 保留各分量便于回测换公式。

### 3.2 事件标注

```
company_events
  id, company_id (FK), date, title (限20字), type (layoff/bonus/org_change/news/other),
  source_note, created_by_user_id, created_at
```

- 手工运营录入大事件（裁员传闻、年终奖发放、组织调整），渲染为 K 线上的标注点。
- **事件标题只陈述事实不下判断**（「传出裁员消息」而非「大裁员血洗」），法务红线见 08 §1。

### 3.3 分享截图卡（M2 传播核心物料）

- `api/og` 路由生成：深色系 + 衬线字 + 公司名 + 周 K 曲线 + 水印 + 邀请码入口。
- 质感验收等同身份卡——这张图会出现在朋友圈和微博，是产品的脸。

## 4. 验收标准

| 指标 | 目标 |
|---|---|
| Top 50 目标公司 | 每家 ≥3 个部门有 ≥5 条 L2 评价 |
| 五维评分完整率 | 100%（提交即必填） |
| 违约库条目审核通过率 | 留观指标：过低说明门槛劝退，过高说明审核放水 |
| 评价被申诉成功率 / 删帖率 | <3%（守门指标，见 09） |
| 情绪指数分享卡生成→注册转化 | 留观，M2 起作为传播漏斗入口统计 |
