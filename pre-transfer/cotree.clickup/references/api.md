# ClickUp REST 操作

用 Node.js 22+ 和当前 Shell 权限运行 scripts/clickup-api.mjs；从 pluginRootDir 定位。不执行任意 URL，不接管登录或密钥保存。query / body 均用本地 JSON 对象文件，最多 256 KiB；写入另加 --apply。

| 命令 | --id | 用途 |
| --- | --- | --- |
| me / workspaces | 不传 | 当前用户 / 已授权 Workspace |
| spaces | Workspace ID | 空间 |
| folders / folderless-lists | Space ID | 文件夹 / 无文件夹列表 |
| lists | Folder ID | 列表 |
| list / tasks / create-task | List ID | 列表详情 / 任务页 / 创建任务 |
| task / comments / update-task / comment | canonical task ID | 任务详情 / 评论页 / 局部更新 / 评论 |

任务页每页最多 100，从 page=0 开始。支持 archived、include_closed、include_timl、subtasks、include_markdown_description、order_by、reverse、statuses / assignees / tags（数组编码为 []）、due_date_gt / lt、date_created_gt / lt、date_updated_gt / lt。层级列表支持 archived；task 支持 include_markdown_description 和 include_subtasks。comments 只支持同时传 start / start_id，取上一页最后评论的毫秒 date 和 id。其他 query 字段拒绝。自定义任务编号不直接受支持，先核实 Workspace 并解析 canonical task ID。

node scripts/clickup-api.mjs tasks --id 12345 --query-file query.json，其中 query.json 例如 {"include_closed":true,"include_timl":true,"subtasks":true,"page":0}。该 ID 仅占位；先读取真实 List。保留同一 operation / id，下一页使用 nextQuery；hasMore=unknown 不表示完整。

创建 body 例如 {"name":"已授权的测试任务"}；comment 为 {"comment_text":"用户已授权的测试评论"}。其他字段按官方当前 schema；body 不再包一层 data。update-task 不支持 custom_fields 专用更新，脚本会拒绝以免静默丢失。未封装 Docs、Chat、计时、附件、删除和自定义字段专用操作。服务器业务字段校验不由本脚本完整替代；写后读取实际对象。

[任务列表](https://developer.clickup.com/reference/gettasks)、[创建任务](https://developer.clickup.com/reference/createtask)、[评论分页](https://developer.clickup.com/reference/gettaskcomments)。
