# 生产监控接入

这份目录把可执行的探针和告警阈值固定下来；阿里云 SLS、云监控和外部探针实例仍需在实际账号中人工创建。

## 日志

- ECS 应用容器使用 Docker `json-file` 驱动，单文件 50 MB、保留 5 个轮转文件。
- Nginx 使用 `/var/log/nginx/sinan_access.log` 的 JSON access log 和
  `/var/log/nginx/sinan_error.log`，采集到 SLS 时保留 `request_id`、状态码和耗时字段。
- 应用错误通过 `ERROR_REPORTING_MODE=stdout` 输出结构化 JSON；不要把 `DATABASE_URL`、验证码或授权令牌写入日志。

## 健康探针

每分钟以 HTTPS 调用：

```text
https://sinanapp.cn/api/health/ready
```

将仓库中的脚本安装到探针主机后使用：

```bash
deploy/scripts/check-web-ready.sh https://sinanapp.cn
```

脚本只接受 `200`，并校验 `status=ready`、`configuration=valid`、`database=reachable`。

## 告警阈值

- ready 连续 3 次失败：P1，暂停扩大邀请范围并按 Runbook 回滚。
- 5 分钟窗口 HTTP 5xx 比例超过 5%：P1。
- ECS CPU、内存或磁盘超过 80%：P2；磁盘持续上升时升级 P1。
- RDS 连接数超过配额 80%：P1，先限制流量并检查连接泄漏。
- 容器退出或重启：P1；同时检查部署审计和候选镜像日志。

## 备份恢复记录

每日 RDS 自动备份，发布前由发布工作流创建手动备份。每月恢复最新备份到隔离 staging，记录：

- 备份时间和恢复开始/结束时间；
- RTO、估算 RPO；
- 用户、评价、研报和有用投票关键表抽样结果；
- 是否在恢复后重新关闭公网访问。
