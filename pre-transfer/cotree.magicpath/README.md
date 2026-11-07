# MagicPath

在 CoTree 中连接 MagicPath，搜索和复用设计组件、同步主题、编辑画布并检查构建结果。

- 插件：cotree.magicpath，版本 0.2.0，CoTree Manifest v3。
- 分类：设计与内容；优先级 P0；第 20 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.magicpath.connect（显式调用）
- Skill：cotree.magicpath.discover
- Skill：cotree.magicpath.integrate
- Skill：cotree.magicpath.canvas（显式调用）
- Skill：cotree.magicpath.themes
- Skill：cotree.magicpath.images（显式调用）
- Skill：cotree.magicpath.share



## 改造内容

- 原综合技能拆为七项原生工作流，覆盖仓库到画布、画布到工程、主题、图片和浏览器。
- 固定 magicpath-ai 2.6.1，本地只读命令辅助器按 argv 执行，支持取消、超时和输出限制；默认只展示计划。
- 独立 MAGICPATH_TOKEN / CLI 登录与 CoTree 浏览器身份分开；保留原图标和完整三份来源参考。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 本机只验证 CLI / 无账户状态 / URL 生成和辅助器，不代表真实团队、组件下载、上传、canvas build 或浏览器账户已验收。
- 写入使用固定官方 CLI；add 可能安装依赖，code start 也创建待处理 revision。CLI 版本变更、外部下载内容及服务端约束需再次核对。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
