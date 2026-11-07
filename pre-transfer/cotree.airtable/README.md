# Airtable

在 CoTree 中查询和维护 Airtable 数据、表结构与自动化草稿，按真实 schema 构造筛选并核实结果。

- 插件：cotree.airtable，版本 0.2.0，CoTree Manifest v3。
- 分类：团队协作与知识；优先级 P0；第 12 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.airtable.connect（显式调用）
- Skill：cotree.airtable.inspect
- Skill：cotree.airtable.search
- Skill：cotree.airtable.records（显式调用）
- Skill：cotree.airtable.schema（显式调用）
- Skill：cotree.airtable.automate（显式调用）
- Skill：cotree.airtable.report

- MCP：cotree.airtable.airtable

## 改造内容

- 三个来源技能改为七个 CoTree 工作流，移除来源专用 CLI 安装和固定 client_id，唯一官方 MCP 直接接入。
- 保留原数据模型 / 筛选方法，补齐字段 ID、choice ID、界面权限、批量读写及离线筛选准备器。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 已适配原生 Skill 与官方 MCP 声明；真实账户读写、权限 / 过期恢复仍待验收。静态 headersEnv 不实现 OAuth 注册、登录、刷新或撤销，不读取来源宿主会话。
- 自动化、接口和 schema 操作取决于实际 MCP 工具、套餐和用户权限；离线筛选准备不证明远端接受或查询结果完整。
- 本地筛选准备器只覆盖记录筛选的已知运算符子集，服务新增 schema 仍需读取实际工具，不把本地不支持等同远端不支持。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
