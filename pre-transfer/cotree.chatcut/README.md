# chatcut

将签名 ChatCut Desktop 通过官方固定版本 stdio 桥接到 CoTree。

- 插件：cotree.chatcut，版本 0.2.0，CoTree Manifest v3。
- 分类：设计与内容；优先级 P0；第 29 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.chatcut.connect
- Skill：cotree.chatcut.edit

- MCP：cotree.chatcut.chatcut_desktop

## 改造内容

- 用官方固定版本公共stdio桥替换Codex配置耦合。
- 保留签名应用为唯一编辑服务，独立CoTree项目核对与操作入口。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 需实际ChatCut Desktop、用户登录及launcher，应用和真实视频编辑未验收。
- Linux不支持；桥接传输夹具不代表真实工具目录或项目可用。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
