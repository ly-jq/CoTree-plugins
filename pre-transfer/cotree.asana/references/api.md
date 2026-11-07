# Asana REST 操作

从 pluginRootDir 定位 scripts/asana-api.mjs，使用 Node.js 22+ 和现有 Shell 权限。每次只执行一个请求，默认读取。--query-file / --body-file 接受最多 256 KiB 的本地 JSON 对象；不接受命令行 token 或自定义 API origin。

| 命令 | --id | 用途 |
| --- | --- | --- |
| me / workspaces | 不传 | 当前用户 / 工作区 |
| projects | 工作区 GID | 项目列表 |
| project / tasks | 项目 GID | 项目 / 项目任务列表 |
| task / stories | 任务 GID | 任务 / 活动 |
| create-task | 不传 | 创建，body 必须有 name 和 workspace / projects / parent |
| update-task / comment | 任务 GID | 局部更新 / text 评论 |

列表支持 limit 1..100（默认 50）、offset；projects 支持 archived，tasks 支持 completed_since。所有命令支持逗号分隔 opt_fields 字符串。其他查询字段拒绝。以官方当前 schema 确定 body 字段；脚本不模拟全部服务端业务校验。Asana data 包裹由脚本生成，不在 body 文件再加 data。

例：node scripts/asana-api.mjs projects --id 12345；node scripts/asana-api.mjs create-task --body-file task.json --apply。task.json 可为 {"name":"已授权的测试任务","projects":["12345"]}；这些数字仅为占位，先核实真实对象。update-task body 只列改变字段，例如 {"completed":true}。写后用 task 读取返回 GID，评论用 stories 核对。

分页只返回 nextQuery；保持同一 operation / id，把 nextQuery 存入新的 query JSON 再读取。hasMore=unknown 表示响应未提供足够分页信息，不能推断完整。offset 会过期；异常时重新核实查询，不更换 origin、不盲目重试写入。保留金额 / GID 精度、日期和时区。高级搜索、项目写入、附件等没有在此封装。

[项目任务](https://developers.asana.com/reference/gettasksforproject)、[创建任务](https://developers.asana.com/reference/createtask)、[分页](https://developers.asana.com/docs/pagination)。
