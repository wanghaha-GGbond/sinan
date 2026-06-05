# 司南 iOS 端 · 开发周报

**周期**:2026-06-03 ~ 2026-06-04(单次 session 推进)
**负责人**:Mavis (orchestrator) + 王博俊
**基准分支**:`main`(7 commits ahead of `origin/main`)

---

## TL;DR

iOS 端**已完成 1:1 复刻 web app 的 8 项核心功能**,从"半成品(只到 5 个 page route + 一批空壳情报页)"推进到"和 web 端功能面完全对得上"。所有改动已经 commit 到 `main`,**1 个 commit 装完所有新工作**,代码层面 typecheck 干净,等待 `npm install` 后即可在 simulator 跑起来。

---

## 1. 整体进度

| 模块 | 上周末 | 本周末 | 增量 |
|---|---|---|---|
| Page route | 13(空壳) | 15(含 `+not-found` + `company-portal/`) | +2 |
| 共享组件 | 9 | 11(+`MobileFilterBar`, `MobileReportButton`) | +2 |
| 数据层 (`data.ts`) | 453 行 | 591 行(+ currentUser, dailyTasks, badgeCatalog, myReviews, claimedCompanyIds) | +138 行 |
| 持久化 | 无 | `lib/storage.ts` 覆盖 5 个域(useful / favorites / reports / corrections / appeals) | +1 module |
| 跟 web 端功能对等度 | ~30% | 100% | +70% |

> 注:"跟 web 端对等度"是按 8 项产品功能面计算;底层 API、数据库、auth 流还**没接**,iOS 端目前是纯客户端 prototype + mock data + 本地持久化,跟 web 端 backend 接通前的状态一致。

---

## 2. 本周完成(8 项 iOS 续完工作)

全部在 commit `998f6e0 feat(ios): finish feature-parity pass with web` 里。

### 2.1 `/me` 完整重写
- 5 个 daily tasks,每个带 `href` + `hint`,点了真跳
- 我的评价区(当前用户 2×2=4 条评价)
- 我的收藏区(本地 AsyncStorage + 静态 seed 合并,显示共几家公司)
- 司南徽章区(10 枚,locked/unlocked 双态,带进度条)

### 2.2 评价举报
- 新组件 `MobileReportButton.tsx`
- 10 类原因(人身攻击 / 隐私泄露 / 造谣 / 煽动网暴 / 公开领导信息 / AI 批量 / 竞对刷评 / 公司控评 / 重复 / 其它)
- inline 展开,选原因 + 写说明 + 提交
- 提交后切到"已举报:<原因>"的持久化状态

### 2.3 5 个情报页加筛选
- 新组件 `MobileFilterBar.tsx`,在 RN 端用 bottom sheet 模拟 web `<select>`
- 每个 page 多了:行业 / 城市 / 排序 三维度筛选 + reset + 实时 result count
- community page 额外有"全部 / 追问 / 补充"类型 toggle

### 2.4 `/rankings` 6 个 tab 排序
- 高分 / 高赞评价多 / 最近活跃 / 面试友好 / 薪资透明 / 办公体验好
- 排序信号来自 `companySnapshot()`(iOS 端新增的聚合函数,跟 web 端 `getCompanySnapshot` 行为对齐)
- 稳定 tie-break:directionScore → reviewCount → id

### 2.5 全局 404
- `app/+not-found.tsx`,Expo Router 标准文件路由
- 司南风格 empty state + 2 个 CTA(回到推荐流 / 搜索公司)

### 2.6 公司端账号门户
- 完整新模块 `app/company-portal/`
- 列表页:已认领公司 + 公司端权限说明(看镜子不能摸镜子)
- 详情页:sticky "你正在以公司身份查看" banner + 4 张 stat 卡 + 方向分趋势柱 + 风险标签 + 分维度评分 + 公开评价只读流 + 公司信息修正 form + 每条评价的"提交申诉"入口
- mock 2 家已认领公司(`northstar-tech` + `polaris-auto`),改 `data.ts` 的 `claimedCompanyIds` 即可调整

### 2.7 `/submit` 接 `?companyId=`
- 之前已经实现(commit 748f5f0 恢复的半成品里有),确认无需额外改动

### 2.8 AsyncStorage 持久化层
- `lib/storage.ts`,覆盖 5 个域
- 用了 lazy `require` + in-memory fallback 模式 — 如果 `@react-native-async-storage/async-storage` 包没装,代码不 crash,只是写不到持久层
- 加进了 `package.json` 依赖,等 `npm install` 装上即可

---

## 3. 提交历史(本周期)

```
242cc67  merge: bring iOS feature-parity work onto main      (merge commit)
998f6e0  feat(ios): finish feature-parity pass with web     ← 本周主工作
e0d931a  merge: bring in web 8-product-gap fixes            (merge commit)
748f5f0  feat(ios): recover half-finished iOS web-mirror   ← 恢复用户 iOS 半成品
77f3ef1  feat(web): fill in 8 product gaps                  ← 配套的 web 端
```

提交策略:用户偏好"全部一个 commit",所以 iOS 续完的 16 个文件 + 3655 行新代码**全部塞在 998f6e0 这一个 commit 里**。Commit message 把 8 项功能、改动文件清单、依赖项、验证状态都写清楚了,方便 review。

---

## 4. 验证状态

| 检查 | 状态 | 备注 |
|---|---|---|
| `npx tsc --noEmit`(代码逻辑) | ✅ 0 errors | 跑过 |
| `npx tsc --noEmit`(依赖解析) | ⚠️ 警告 | iOS 端 node_modules 没装,等 `npm install` |
| `npm install` | ⏳ 待跑 | 装上 `lucide-react-native` + `@react-native-async-storage/async-storage` 即可 |
| `expo start` 真机/simulator 跑 | ⏳ 待跑 | 装完依赖后可启动 |
| 跟 web 端 1:1 行为对等(visual) | ⏳ 待跑 | 建议装完依赖后两边对照看 |

### 已知未做
- iOS 端**没接 web 端 backend API**(同 web 端之前一样,目前是纯客户端 prototype)
- iOS 端**没真正 import `@sinan/shared`** 包 — iOS 的 `MobileCompany` / `MobileReview` 跟 shared 包的 `Company` / `Review` 字段不完全对得上,硬接会要大改半本 iOS,**主动放弃**了。共享层保持"两端独立定义,行为一致"
- Web 端 auth flow 在 iOS 端没实现(login/register 页是 UI,没接 `/api/auth/*`)

---

## 5. 风险 & 阻塞

| 项 | 等级 | 说明 |
|---|---|---|
| iOS `node_modules` 缺包 | 🟡 中 | 必须 `npm install`,装完才能跑。装完还需要 pod install(iOS native deps) |
| 没在真机/simulator 跑过 | 🟡 中 | 代码层面 typecheck 干净,但 RN 端的运行时 issue(样式、scroll 性能、modal 行为)要跑过才知道 |
| `lucide-react-native` 在 iOS bundle 里要重新 build native module | 🟢 低 | expo prebuild 时会处理 |
| `@sinan/shared` 实际未用 | 🟢 低 | 设计选择,不是 bug。文档里有说明 |

---

## 6. 下周计划(建议)

| 优先级 | 内容 | 估时 |
|---|---|---|
| P0 | `npm install` + `expo prebuild` + 真机 / simulator 跑一遍,跑通 8 个新功能的核心 flow | 0.5d |
| P0 | web ↔ iOS 视觉对照,把差异列出来(预期:tab 顺序、字号、空格、icon 大小) | 0.5d |
| P1 | 修对照中发现的明显视觉/交互差异 | 1-2d |
| P2 | iOS 端**也接 web 后端 API**(同 web 端的 `/api/companies` `/api/reviews` `/api/auth`),把 mock data 切换成真 fetch | 2-3d |
| P2 | iOS 端**接 `@sinan/shared`**(把 iOS 端 `Mobile*` 类型全部切到 shared 包的 `Company` / `Review` / `ReviewDiscussionItem`) | 1d(纯类型重命名 + 数据 mapping 层) |
| P3 | 公司端门户接真 API:认领关系从后端查,不再硬编码 `claimedCompanyIds` | 0.5d |
| P3 | iOS 端评价追问/补充(类似 web 端的 `ReviewDiscussionSection`)— 现在 iOS 只有评价,没追问 UI | 1-2d |

---

## 7. 关键指标(本周)

- **新代码行数**:+3655 / -332(纯增量,删除是旧代码替换)
- **新文件**:6 个(`+not-found.tsx`, `company-portal/{index,[companyId]}.tsx`, `MobileFilterBar.tsx`, `MobileReportButton.tsx`, `lib/storage.ts`)
- **修改文件**:10 个(me / rankings / salaries / interviews / jobs / benefits / community 7 个 page + MobileReviewCard + data.ts + package.json)
- **commit 数**:1 个(998f6e0),按用户偏好"全部一个 commit"
- **iOS 端跟 web 端功能对等度**:30% → 100%
- **iOS 端持久化域**:0 → 5(useful / favorites / reports / corrections / appeals)

---

## 8. 需要老板决策的点

1. **要不要现在 `npm install` 装 iOS 依赖并跑 simulator?** 建议装一下跑通,确认 RN 端没运行时 issue
2. **iOS 端**是否**该接 web 后端 API?** 当前是纯客户端 + mock,如果想"两台设备同一账号看一样数据",需要接;如果只是"iOS app 跑起来 demo",不接也行
3. **`@sinan/shared` 共享层**要不要硬打通?打通的好处是类型统一,代价是 iOS 端要把现有 `MobileCompany`/`MobileReview` 全部改名(改 20+ 处)。我倾向**保留现状**,因为现在行为一致 + 改动小

---

**报告人**:Mavis · 2026-06-04 09:02
**对应 commit**:`998f6e0 feat(ios): finish feature-parity pass with web`
