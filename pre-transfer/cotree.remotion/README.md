# Remotion

在 CoTree 中编写、预览和渲染 Remotion 视频，处理动画、字幕、媒体、地图和嵌入式播放器。

- 插件：cotree.remotion，版本 0.2.0，CoTree Manifest v3。
- 分类：设计与内容；优先级 P0；第 17 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.remotion.create
- Skill：cotree.remotion.compose
- Skill：cotree.remotion.media
- Skill：cotree.remotion.captions
- Skill：cotree.remotion.maps
- Skill：cotree.remotion.interactive
- Skill：cotree.remotion.preview
- Skill：cotree.remotion.render（显式调用）
- Skill：cotree.remotion.app
- Skill：cotree.remotion.docs
- Skill：cotree.remotion.upgrade（显式调用）



## 改造内容

- 十二个来源技能（含路由入口及嵌套副本）收敛为十一项原生工作流，保留完整技术与地图资源。
- 新增固定版本的独占新目录模板和本地渲染参数规划器，输出禁止覆盖，透明视频匹配容器、像素格式和编码。
- 移除强制 Codex 浏览器、自动上游技能更新与强制停止门，复用 CoTree 的文件、浏览器和执行权限。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 原生工作流、随包工具和安装合同已改造；真实模型任务、用户工程、账户发布及各平台设备效果需分别验收。
- 模板固定 Remotion 4.0.506 / React 19.2.0，不代表最新版本；实际渲染需要项目依赖、兼容浏览器及该平台 compositor。
- 脚手架与参数计划不执行安装、渲染或云发布。字幕转写、配音、地图资源和云渲染为可选独立服务；不能用本地样例验证这些账户能力。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
