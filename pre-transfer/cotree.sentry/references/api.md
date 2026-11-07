# 只读 API 脚本

要求 Node 20+。在插件根执行 node scripts/sentry-api.mjs --help 查看参数；仅使用 COTREE_SENTRY_API_TOKEN 环境变量，不接受 token 参数。

- list-issues --org <org> --project <slug或id> --time-range 24h --environment <环境> --limit 20 --query "is:unresolved"
- list-issues --org <org> --project <slug或id> --short-id <PROJECT-123>：数字 ID 解析；服务可能忽略部分过滤，脚本核对返回 project，输出此限制。
- issue-detail <数字id> --org <org>
- issue-events <数字id> --org <org> --time-range 24h --environment <环境> --limit 20
- event-detail <32位eventId> --org <org> --project <project>；确需时加 --include-entries。

以上命令前均加 node scripts/sentry-api.mjs。不默认环境名；未传环境表示该查询不按环境筛选。查询默认 24h / 20 条，最多 50 条、10 页。结果包含分页 / 截断事实，无数据明确返回空数组。

list-issues 使用 /api/0/organizations/{org}/issues/ 并显式 project、statsPeriod、sort=date；项目 Issues 旧端点的 statsPeriod 只调整 stats 字段，不能据此筛选“最近 24h”。Issue 详情和事件列表使用组织级 Issue 路径，event-detail 使用指定项目路径。

所有请求 GET，15 秒超时；429 / 5xx 最多再试一次，遵守不超过 5 秒的 Retry-After，较长等待交由上层处理。保持原查询范围，只取同 origin / path 的 Link cursor；拒绝重定向、重复 cursor、错误响应形状和大于 4 MiB 的响应。错误不回显服务响应正文或 token。默认只输出必要字段，省略 entries，脱敏常见邮件 / IP 和敏感字段；交付前仍须审查业务内容。

依据：[组织 Issues](https://docs.sentry.io/api/events/list-an-organizations-issues/)、[Issue 事件](https://docs.sentry.io/api/events/list-an-issues-events/)、[项目事件](https://docs.sentry.io/api/events/retrieve-an-event-for-a-project/)、[分页](https://docs.sentry.io/api/pagination/)。
