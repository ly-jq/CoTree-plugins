# Asana

在 CoTree 中查询 Asana 项目、管理任务、协作评论并汇总进度，含独立 REST 入口。

- 插件：cotree.asana，版本 0.2.0，CoTree Manifest v3。
- 分类：团队协作与知识；优先级 P0；第 10 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.asana.connect（显式调用）
- Skill：cotree.asana.find
- Skill：cotree.asana.tasks（显式调用）
- Skill：cotree.asana.projects（显式调用）
- Skill：cotree.asana.collaborate（显式调用）
- Skill：cotree.asana.report

- MCP：cotree.asana.asana

## 改造内容

- 来源专属安装命令改为六个 CoTree 工作流，预注册 MCP app 与标准 API 凭据分别说明。
- 新增十项固定 REST 操作，处理 Asana data envelope、GID、offset 分页、写入授权开关和有界响应。
- 保留来源命令与元数据供追溯，不注册原宿主命令。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- MCP OAuth 获取 / 刷新未接入，已有合法 MCP app access token 可绑定完整 Bearer header；标准 API PAT / API OAuth token 不能代替它。
- REST 的独立 PAT 或标准 API OAuth token 使用 COTREE_ASANA_API_TOKEN；真实账户读写与权限仍待验收。
- 辅助 REST 每次一页，响应最多 4 MiB、请求 JSON 最多 256 KiB、15 秒超时；不跟随重定向，不自动重试，不支持任意 URL / DELETE。--apply 只是写入开关，不授予权限。其他操作通过已认证 MCP 的实际 schema，不能声称 REST 覆盖全部服务。
- REST 不封装高级搜索、项目写入、依赖 / 自定义字段专用操作、附件与永久删除；按 MCP 实际工具补充。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
