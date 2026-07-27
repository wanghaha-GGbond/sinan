# 公司研报工作流

目标：先做一份互联网和金融头部公司的研究报告，作为司南 App 最开始的内容资产和判断框架。数据库 seed 是后续可选动作，不是第一目标。

## 1. 推荐顺序

### 第一批：头部样本

先做 10-20 家，打磨口径。

- 互联网：字节跳动、腾讯、阿里巴巴、美团、小红书。
- 金融：招商银行、平安集团、中信证券、蚂蚁集团、东方财富。

### 第二批：行业扩展

- 互联网：电商、本地生活、内容社区、游戏、云计算、AI、SaaS。
- 金融：银行、券商、基金、保险、支付、消费金融、金融科技。

### 第三批：长尾补充

只补基础画像、招聘方向和明确事件，不强求每家公司都有完整研报。

## 2. 运行采集

复制头部公司目标文件：

```bash
cp apps/web/src/db/seeds/research-targets-head.example.json apps/web/src/db/seeds/research-targets.json
```

第一次建议可视化运行，并手动登录平台：

```bash
npm run research:login:boss --workspace=@sinan/web
npm run research:login:xhs --workspace=@sinan/web
npm run research:login:weibo --workspace=@sinan/web
npm run research:login:zhihu --workspace=@sinan/web
```

每条命令只处理一个平台。浏览器打开后，登录完成再回到终端按回车。

之后复用登录态采集，也建议一个平台一个平台跑：

```bash
npm run research:collect:boss --workspace=@sinan/web
npm run research:collect:xhs --workspace=@sinan/web
npm run research:collect:weibo --workspace=@sinan/web
npm run research:collect:zhihu --workspace=@sinan/web
```

采集结果：

```text
apps/web/src/db/seeds/research-observations.json
```

## 3. 生成研报草稿

```bash
npm run research:report --workspace=@sinan/web
```

输出：

```text
apps/web/src/db/seeds/reports/company-research-report.md
```

这份 Markdown 是研报草稿，不是最终结论。你需要在每家公司下面补：

- 公司画像
- 求职机会
- 主要风险
- 适合人群
- 是否进入 App 首批内容

## 4. App 如何使用这份研报

第一阶段，研报更适合作为内容资产：

- App 首屏的公司专题
- 行业榜单的判断口径
- 公司详情页的“司南观察”
- 求职风险标签的命名体系
- 后续数据库字段和后台管理的设计依据

第二阶段，才把稳定结论结构化：

- `companies.description`
- `company_events`
- `company_sentiment_daily`
- 未来的“司南观察/研报摘要”表

研究阶段先进入独立 SQLite 证据库，不直接写入 App：

```bash
npm run research:db:sync --workspace=@sinan/web
npm run research:db:summary --workspace=@sinan/web
```

数据库会拆出部门、平台情绪、机会/风险观点、证据可用性和研究缺口。具体结构和查询方式见
[研究数据库](./research-database.md)。

## 5. 边界

- observation 是证据线索，不是发布内容。
- 单条帖子不能直接变成事实结论。
- 登录后可见页面也要遵守平台规则，不绕过验证码、付费墙或访问控制。
- 敏感个人信息不进入研报，也不进入 App。
