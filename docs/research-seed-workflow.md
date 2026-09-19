# 公司研究种子数据工作流

目标：你用 Playwright MCP 自己访问 Boss 直聘、小红书、微博等公开页面，完成公司分析后，把整理后的结果作为 App 初始数据导入。

Agent 设计见：[公司研究 Agent 设计](./company-research-agent.md)。

## 工作流

1. 复制示例：

```bash
cp apps/web/src/db/seeds/research-companies.example.json apps/web/src/db/seeds/research-companies.json
```

2. 准备研究目标，并用 Playwright 采集公开页面观察结果：

```bash
cp apps/web/src/db/seeds/research-targets.example.json apps/web/src/db/seeds/research-targets.json
npm run research:collect --workspace=@sinan/web
```

这会生成 `apps/web/src/db/seeds/research-observations.json`。你复核后，再按公司填写 `research-companies.json`。

如果需要手动登录某个平台后再研究，可以使用持久浏览器目录：

```bash
npm run research:login:boss --workspace=@sinan/web
npm run research:login:xhs --workspace=@sinan/web
npm run research:login:weibo --workspace=@sinan/web
npm run research:login:zhihu --workspace=@sinan/web
```

如果需要给受限页面留证据截图：

```bash
npm run research:collect --workspace=@sinan/web -- --screenshots
```

3. 校验 JSON：

```bash
npm run db:seed:research:validate --workspace=@sinan/web
```

4. 生成 SQL：

```bash
npm run db:seed:research --workspace=@sinan/web
```

5. 把生成的 SQL 导入数据库：

```bash
psql "$DATABASE_URL" -f apps/web/src/db/seeds/research-companies.generated.sql
```

## 字段怎么填

- `companies[].description`：写你的公司分析摘要，可以综合 Boss 直聘招聘方向、小红书经验贴、微博舆情。
- `companies[].sentiment`：写你总结后的情绪指数，不保存原始帖子；`components` 可记录各平台分项。
- `companies[].events`：写影响求职判断的事件，例如招聘扩张、组织调整、产品发布、奖金/裁员传闻等。
- `companies[].departments`：写初始部门，后续用户评价可以挂到这些部门。

## 原则

- App 初始数据只放整理后的结论，不放批量抓取的原始内容。
- 可以在 `sourceUrl` 放公开链接或你自己的研究笔记链接，方便复盘。
- 手机号、微信号、个人姓名等敏感信息不要写入种子数据。
- 如果信息只来自传闻，写在 `events.title` 里要保守，比如使用“社交平台出现讨论”而不是直接下结论。
