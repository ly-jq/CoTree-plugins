# Outlook Calendar

在 CoTree 中读取 Outlook 日程和忙闲，准备会议，安排、改期、取消或回复邀请。

- 插件：cotree.outlook-calendar，版本 0.2.0，CoTree Manifest v3。
- 分类：通信与日程；优先级 P0；第 11 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.outlook-calendar.connect（显式调用）
- Skill：cotree.outlook-calendar.agenda
- Skill：cotree.outlook-calendar.availability
- Skill：cotree.outlook-calendar.schedule（显式调用）
- Skill：cotree.outlook-calendar.respond（显式调用）
- Skill：cotree.outlook-calendar.brief



## 改造内容

- 来源私有连接器替换为独立 Graph v1.0 委托 REST，新增六个原生工作流和十三项实际操作。
- 明确 calendarView 实例窗口、Microsoft 状态语义、组织者取消、参与者回复、通知及 ID 稳定性。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 随包 REST 客户端使用固定操作和固定 HTTPS origin，一次一页，1 MiB JSON 输入 / 8 MiB 响应、20 秒超时；不跟随重定向、不自动重试、不存储凭据。真实账户读写与 OAuth 获取 / 刷新仍待验收。
- 需要 COTREE_OUTLOOK_CALENDAR_ACCESS_TOKEN 与匹配 Graph 委托权限；无原生 MCP 服务声明，不伪造微软服务端点。
- getSchedule 不支持个人 Microsoft 账户；此包不封装应用身份、共享邮箱、国别云、日历删除、订阅 / delta 或整个系列的高级拆分。
- Graph 的本地 dateTime / timeZone 与 Google RFC3339 不互换；夏令时模糊时刻与 Microsoft 支持的时区需账户 / 具体任务核实。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
