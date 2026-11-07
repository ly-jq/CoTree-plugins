# HyperFrames

在 CoTree 中制作 HTML 视频，支持可定位时间线、字幕、声音、组件、网页分镜、本地预览和视频渲染。

- 插件：cotree.hyperframes，版本 0.2.0，CoTree Manifest v3。
- 分类：设计与内容；优先级 P0；第 19 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.hyperframes.create
- Skill：cotree.hyperframes.animate
- Skill：cotree.hyperframes.media
- Skill：cotree.hyperframes.captions
- Skill：cotree.hyperframes.registry
- Skill：cotree.hyperframes.website
- Skill：cotree.hyperframes.preview
- Skill：cotree.hyperframes.render（显式调用）



## 改造内容

- 五项来源技能拆为八个原生工作流，完整保留 GSAP、字幕、声音、转场、配色与七步网页视频参考。
- 新增 HyperFrames 0.8.139 / GSAP 3.15.0 本地模板和 argv 执行入口；不执行 init 的宿主技能安装，不更新 CoTree 插件内容。
- 实际渲染使用新输出目录和单 worker，默认只返回命令计划；可选转写 / AI 服务身份单列，不从原宿主读取凭据。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 需要 Node 22+、工程依赖、兼容 Chrome / Chromium 和 FFmpeg；模板固定版本，其他版本要先核对 CLI help。
- 本地 HTML / MP4 验证不证明所有 registry、媒体、声音、外部网站、GPU、云转写或 AI 账户均可用。模板无声音；音画同步需有实际音轨后验收。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
