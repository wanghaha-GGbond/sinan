# 司南上线数据库演练手册

## 目标

在独立 Neon staging 分支验证 `0000` 到 `0015` 的全量迁移、应用启动、核心写入和恢复能力。严禁首次演练直接连接生产分支。

## 前置条件

- 创建与生产配置一致的 staging 项目或数据库分支。
- 将 staging 连接串仅配置在本地临时环境或部署平台 secret 中。
- 确认连接串中的数据库名和主机明确属于 staging。
- 演练前在 Neon 控制台创建可恢复的分支或快照，并记录创建时间。

## 执行步骤

1. 静态检查：`npm run db:check --workspace=@sinan/web`
   CI 还会在空 PostgreSQL 16 上执行 `npm run db:verify:postgres --workspace=@sinan/web`，捕获重复索引名、外键顺序和 SQL 方言错误。
2. 基线验证：`npm run verify --workspace=@sinan/web`
3. 记录开始时间和 staging 分支标识。
4. 执行迁移：`npm run db:migrate --workspace=@sinan/web`
5. 再次执行迁移，确认重复运行不会产生额外变更或错误。
6. 执行并发测试：`npm run test:integration --workspace=@sinan/web`
7. 执行 `npm run test:e2e:release --workspace=@sinan/web`，覆盖邀请注册、公司搜索/详情、匿名评价、审核公开、评分聚合、研报 API 与账号注销。
8. 核对邀请码只能消费一次，审核并发不会重复写入审核事件。
9. 记录迁移耗时、失败信息、数据库分支和应用版本。

配置 GitHub secret `NEON_STAGING_DATABASE_URL` 后，也可手动触发 `Database integration` workflow 执行步骤 1、4、5、6、7。该 secret 只能指向可丢弃的 staging 数据库。

## 恢复演练

1. 停止 staging 应用写入。
2. 从演练前分支或快照创建恢复分支，不在原分支手工删除表。
3. 将 staging 应用连接切换到恢复分支。
4. 验证迁移前数据行数、登录和只读查询。
5. 记录恢复点目标、实际恢复耗时和数据损失窗口。

2026-07-05 本地 PostgreSQL 16 基线演练已完成：首次演练发现并修复重复索引名及缺失拍卖表迁移；`drizzle-kit migrate` 现可从空库应用 17 个迁移，第二次执行幂等成功，生成 29 张业务表并记录 17 条迁移日志。备份、删除、重建和哨兵恢复成功；数据库并发测试 5/5、核心 HTTP 发布闭环 1/1 通过。CI 会重复执行这些检查。该结果不替代 Neon staging 分支切换、Resend 和生产监控演练。

生产环境不执行向下迁移。已应用迁移出现问题时，优先恢复数据库分支并回退应用版本；确认数据安全后再编写前向修复迁移。

## 通过标准

- `db:check`、`verify` 和两次 `db:migrate` 均成功。
- 首发核心 API 流程在真实数据库上通过。
- 并发认证、邀请消费和评价审核没有重复写入。
- 恢复分支可在 30 分钟内接管 staging，关键表抽样数据一致。
- 演练记录不包含数据库连接串、验证码、密码或其他 secret。
