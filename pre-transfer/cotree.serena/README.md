# Serena

将 Serena 的语义导航、符号编辑与项目笔记接入 CoTree 当前工作区。

- 插件：cotree.serena，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 18 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.serena.connect（显式调用）
- Skill：cotree.serena.navigate
- Skill：cotree.serena.edit（显式调用）
- Skill：cotree.serena.diagnose
- Skill：cotree.serena.memory（显式调用）
- Skill：cotree.serena.verify

- MCP：cotree.serena.serena

## 改造内容

- 原通用启动入口改为当前 workspace 的单项目 ide context，移除重复的基础文件 / Shell / 项目切换工具。
- 新增六项原生工作流，保留固定上游提交；默认无 dashboard / GUI，使用现有 MCP 生命周期。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 本包原生工作流、辅助工具与安装合同已适配；用户工程、真实模型任务、云服务和设备业务分别验收，不由协议夹具或示例代替。
- 需要 uv / Python 3.11..3.14、目标语言服务器和可读写的工程缓存目录；首次 uvx / 语言索引可联网下载依赖。固定提交是 2.0.0.dev0 来源快照，不承诺稳定发布版。
- Serena 子进程可能启动语言服务并写入 .serena / 用户缓存；工作区绑定不是 OS 沙箱。不同语言和平台需独立验收，不自动启用或安装。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
