# 公司研究 Agent 设计

目标：用 Playwright MCP / Playwright 辅助访问 Boss 直聘、小红书、微博、知乎等公开页面，先沉淀公司研究 observation，再生成头部公司研报草稿。数据库 seed 只是后续可选动作。

## 1. Agent 职责边界

这个 agent 是“研究助理”，不是无边界爬虫。

它做：

- 根据公司名单打开公开搜索页或公开详情页。
- 记录可复盘的来源链接、检索词、观察到的公开信号。
- 归纳招聘方向、部门结构、求职风险、舆情倾向、关键事件。
- 生成研报草稿，供人工复核和产品化。

它不做：

- 绕过登录、验证码、付费墙、访问限制或平台反爬规则。
- 批量保存个人敏感信息、私信、手机号、微信号、身份证号。
- 把单条吐槽直接当事实写入 App。
- 直接修改生产数据库。

## 2. 推荐架构

```
Company List
  -> Research Agent (Playwright MCP / Playwright 浏览、搜索、摘录公开可见信号)
  -> Observation JSON (research-observations.json)
  -> Report Draft Writer (company-research-report.md)
  -> Human Analysis (正式研报与产品判断)
  -> Optional Seed Writer (必要时再写 research-companies.json)
```

### Research Agent

输入：

- 公司名称、城市、行业、官网等基础信息。
- 平台清单：Boss 直聘、小红书、微博。
- 每个平台最多查看多少条结果，例如 5-10 条。

输出：

- 每个平台的检索词。
- 每个平台观察到的摘要。
- 可复盘链接。
- 样本数量。

### Analysis Agent

输入：Research Agent 的观察结果。

输出：

- `description`：公司画像摘要。
- `departments`：初始部门建议。
- `sentiment[].score`：0-10 情绪分。
- `sentiment[].components`：平台分项分。
- `events[]`：对求职判断有影响的事件。

### Report Draft Writer

输入：Research Agent 的 observation。

输出：`company-research-report.md` 研报草稿。

要求：

- 按公司分组，保留平台、检索词、链接、访问状态和可见文本摘要。
- 明确哪些内容是 observation，哪些内容需要人工结论。
- 不把原始 observation 当作 App 发布内容。

## 3. 单家公司研究流程

1. 建立公司档案。

   必填：`name`、`city`、`industry`。
   尽量补充：`registeredName`、`shortName`、`size`、`website`、`emailDomains`。

2. Boss 直聘研究。

   观察：

   - 在招岗位数量和岗位类型。
   - 高密度部门：研发、产品、运营、销售、算法、数据等。
   - 薪资区间是否偏高或波动大。
   - 岗位描述里反复出现的要求，例如“抗压”“快速迭代”“商业化”“出差”。

   写入：

   - `departments`
   - `description`
   - `events` 中的招聘变化
   - `sentiment.components.boss_zhipin`

3. 小红书研究。

   观察：

   - 面试体验。
   - 工作节奏。
   - 薪资兑现、年终、调薪。
   - 管理风格、团队氛围。

   写入：

   - `description`
   - `sentiment.components.xiaohongshu`
   - 谨慎写入 `events`

4. 微博研究。

   观察：

   - 近期舆情事件。
   - 产品、裁员、组织调整、奖金、维权等关键词。
   - 信息是否来自多个独立公开来源。

   写入：

   - `sentiment.components.weibo`
   - `events`

5. 生成综合结论。

   分数建议：

   - 8-10：公开信号整体正向，风险较少，招聘/业务信息稳定。
   - 6-8：正常公司，有明确机会，也有需确认问题。
   - 4-6：负面或不确定信号较多，求职前应重点追问。
   - 0-4：公开风险密集，除非证据很强，否则不要轻易给到这个区间。

## 4. Agent 提示词模板

把下面这段作为 Playwright MCP 研究 agent 的系统/任务提示词使用：

```text
你是司南 App 的公司研究助理。你的任务是使用 Playwright MCP 浏览公开网页，帮助整理互联网和金融头部公司的研报 observation。

研究对象：
- 公司名称：{{companyName}}
- 城市：{{city}}
- 行业：{{industry}}

研究平台：
- Boss 直聘：观察公开招聘岗位、岗位方向、薪资区间、岗位描述中的重复信号。
- 小红书：观察公开笔记中的面试、工作节奏、薪资兑现、管理风格、团队氛围。
- 微博：观察公开搜索结果中的近期舆情、产品/组织/裁员/奖金等事件。

约束：
- 只访问公开页面，不绕过登录、验证码、付费墙或访问限制。
- 不保存手机号、微信号、身份证号、个人住址等敏感信息。
- 不把单条帖子当成事实。无法交叉验证的信息必须保守表达。
- 最终只输出 observation JSON，不输出未经复核的事实结论。

输出 observation JSON 结构：
{
  "companyName": "",
  "platform": "",
  "query": "",
  "requestedUrl": "",
  "finalUrl": "",
  "status": 200,
  "access": "ok",
  "title": "",
  "visibleText": "",
  "links": []
}
```

## 5. 批量研究策略

先不要一口气研究几百家公司。建议分三批：

- 第 1 批：20 家头部公司，用来打磨字段和展示效果。
- 第 2 批：50-100 家目标行业公司，用来填充搜索、榜单、公司页。
- 第 3 批：长尾公司，只补基础信息和少量事件。

每家公司建议控制：

- Boss 直聘：最多 10 个公开岗位。
- 小红书：最多 10 条公开结果。
- 微博：最多 10 条公开结果。

## 6. 研报流程

先复制研究目标模板：

```bash
cp apps/web/src/db/seeds/research-targets-head.example.json apps/web/src/db/seeds/research-targets.json
```

采集公开页面观察结果：

```bash
npm run research:collect --workspace=@sinan/web
```

如需人工看浏览器过程，可用：

```bash
npm run research:collect --workspace=@sinan/web -- --headed
```

可选参数：

```bash
# 使用已登录状态，适合你手动登录后保存 Cookie，再重复研究
npm run research:collect --workspace=@sinan/web -- --storage-state=src/db/seeds/.auth/state.json

# 使用持久浏览器目录，适合第一次手动登录/保持会话
npm run research:collect --workspace=@sinan/web -- --headed --user-data-dir=.research-browser

# 给失败或所有页面保留截图，方便人工复核
npm run research:collect --workspace=@sinan/web -- --screenshots
```

脚本会输出：

```text
apps/web/src/db/seeds/research-observations.json
```

Observation 包含：

- `requestedUrl` / `finalUrl`：检索地址和最终地址。
- `status` / `access`：页面状态，可能是 `ok`、`login_required`、`verification_required`、`limited_or_failed`。
- `title` / `visibleText`：公开可见文本摘要。
- `links`：页面上可见链接摘要。
- `screenshotPath`：受限或失败页面的截图路径。

生成研报草稿：

```bash
npm run research:report --workspace=@sinan/web
```

输出：

```text
apps/web/src/db/seeds/reports/company-research-report.md
```

## 7. 后续可以开发的自动化

- Observation -> seed 草稿生成器：把 `research-observations.json` 转成待人工复核的 `research-companies.draft.json`。
- 证据笔记文件：把每家公司研究过程存到 `research-notes/{{company}}.md`，但不导入 App。
- 人工复核队列：对低置信度事件加 `needsReview` 字段。
- UI 管理页：在后台上传 `research-companies.json` 并预览即将导入的数据。
