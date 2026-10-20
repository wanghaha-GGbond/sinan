# 司南研究数据库

研究数据库用于维护公司研报证据、结构化观点和人工复核状态，不是 App 正式生产数据。

数据库文件：

```text
apps/web/src/db/seeds/research-store.sqlite
```

## 数据层

- `companies`：研究目标公司。
- `observations`：各平台当前最佳采集结果。
- `evidence_items`：搜索结果和二级详情证据。
- `external_evidence`：官网、公告、校方转载等校准来源。
- `insight_cards`：研报卡片原始 JSON。
- `company_departments`：规范化重点部门。
- `sentiment_components`：各平台情绪分项及证据可用性。
- `company_signals`：机会/风险观点、依据、来源平台和 URL。
- `theme_evidence`：下午茶、食堂、加班、双休和裁员恐慌等主题校准证据。
- `company_indices` / `company_index_components`：当前公司总指数与分项。
- `company_index_evidence`：体感指数到具体搜索页、详情页或外部来源的贡献关系。
- `index_runs` / `company_index_history`：去重后的指数运行批次和历史快照。
- `research_gaps`：自动检测的补采与人工复核待办。
- `analyst_reviews`：人工公司画像和发布决定；重新同步时不会清空。
- `search_documents`：用于证据检索的统一索引。
- `collection_runs`：同步历史。

## 查询视图

- `company_research_overview`：每家公司的一行总览。
- `evidence_catalog`：平台证据与外部证据的统一目录。
- `research_backlog`：按严重程度排列的当前研究缺口。

## 常用命令

重新同步并查看统计：

```bash
npm run research:db:sync --workspace=@sinan/web
npm run research:db:summary --workspace=@sinan/web
```

查看单家公司完整研究档案：

```bash
npm run research:db:company --workspace=@sinan/web -- --name=字节跳动
```

查看指数历史：

```bash
npm run research:db:history --workspace=@sinan/web -- --company=字节跳动
npm run research:db:history --workspace=@sinan/web -- --index=fun_layoffAnxiety
```

相同模型输出会按内容指纹去重；只有分数、置信度、证据数量或模型版本实际变化时才新增历史批次。

查看高优先级缺口：

```bash
npm run research:db:gaps --workspace=@sinan/web -- --severity=high
```

检索证据：

```bash
npm run research:db:search --workspace=@sinan/web -- 奖金 --limit=10
```

查看近期采集结果：

```bash
npm run research:db:recent --workspace=@sinan/web -- --fresh-only
npm run research:db:recent --workspace=@sinan/web -- --platform=weibo --company=字节跳动
```

近期批次会保留 `query_suffix`、推断出的 `latest_published_date` 和 `freshness_status`。查询词包含年份并不自动代表结果新鲜，旧帖子会标记为 `stale`，没有可识别日期的结果标记为 `unknown`。

写入分析师复核：

```bash
npm run research:db:review --workspace=@sinan/web -- \
  --company=字节跳动 \
  --profile="公司画像" \
  --opportunity="求职机会" \
  --risks="主要风险" \
  --candidates="适合人群" \
  --decision=hold \
  --status=completed \
  --reviewer=wangbojun
```

## 证据质量

`access=ok` 只表示页面可以访问，不代表正文有效。

`sentiment_components.evidence_usable` 会进一步检查：

- 正文是否为空或仅为“加载中”。
- 页面是否只有导航、备案信息或页脚。
- 正文是否包含研究公司名称。
- 知乎结果是否只有搜索导航壳。

不可用证据会进入 `research_gaps.thin_evidence`，并在搜索索引中降权。

### 观点证据规则

`research-external-evidence.json` 中的官方材料可以增加两个结构化字段：

- `departments`：由招聘页、财报或业务官网直接支持的部门/方向。
- `signals`：包含 `type`（`opportunity` 或 `risk`）和 `signal` 的可发布候选观点。

生成洞察卡时遵守以下顺序：

1. 官方招聘、财报、公告和业务官网可直接支撑结构化观点，并保留来源 URL。
2. 知乎、微博等搜索结果只作为弱观察材料；未成功打开详情页或未经人工复核时，不自动生成公司风险结论。
3. 小红书页脚、Boss 加载页、知乎导航壳不参与情绪、部门或观点计算。
4. `company_signals.source_kind` 区分 `external`、`platform` 和 `none`；发布前只接受 `evidence_usable=1` 的观点。
5. 风险证据不足时明确输出“待补充”，不根据检索词补写结论。

## 同步边界

每次 `sync` 会从 JSON 重建当前平台证据、外部证据、洞察卡及其派生表。

`analyst_reviews`、`collection_runs`、`index_runs` 和 `company_index_history` 不会被清空：

- 人工判断可以持续迭代。
- 采集和同步过程可以追溯。
