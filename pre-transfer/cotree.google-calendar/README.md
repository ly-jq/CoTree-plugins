# Google Calendar

在 CoTree 中查看 Google 日程、查询忙闲、准备会议并创建或调整事件，含独立 Calendar REST。

- 插件：cotree.google-calendar，版本 0.2.0，CoTree Manifest v3。
- 分类：通信与日程；优先级 P0；第 11 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.google-calendar.connect（显式调用）
- Skill：cotree.google-calendar.agenda
- Skill：cotree.google-calendar.availability
- Skill：cotree.google-calendar.schedule（显式调用）
- Skill：cotree.google-calendar.modify（显式调用）
- Skill：cotree.google-calendar.brief

- MCP：cotree.google-calendar.google-calendar

## 改造内容

- 专属连接器改为六个原生工作流及九项 Calendar REST 操作，保留原图标和官方 MCP。
- 显式时间窗口、重复实例、全天独占结束日期、分页、ETag 和通知参数进入执行合同。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 随包 REST 客户端使用固定操作和固定 HTTPS origin，一次一页，1 MiB JSON 输入 / 8 MiB 响应、20 秒超时；不跟随重定向、不自动重试、不存储凭据。真实账户读写与 OAuth 获取 / 刷新仍待验收。
- 官方 MCP 仍需 Workspace Developer Preview 准入、Calendar API / MCP API 启用和独立 OAuth；普通 API key 不可替代。
- REST 不包含 ACL 管理、日历创建 / 永久清空、增量同步、事件导入 / 跨日历移动；会议链接与附件须匹配实际 API schema 和权限。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
