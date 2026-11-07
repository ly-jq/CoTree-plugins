# higgsfield

用独立 Higgsfield MCP 生成视频素材，并在本地完成旁白、字幕与成片验证。

- 插件：cotree.higgsfield，版本 0.2.0，CoTree Manifest v3。
- 分类：设计与内容；优先级 P0；第 29 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.higgsfield.connect
- Skill：cotree.higgsfield.faceless
- Skill：cotree.higgsfield.narration
- Skill：cotree.higgsfield.captions
- Skill：cotree.higgsfield.finish

- MCP：cotree.higgsfield.higgsfield

## 改造内容

- 保留无人出镜、旁白、字幕全套资料，迁移为独立MCP与跨平台本地处理。
- 提供真实FFmpeg合成/字幕/探测，改写隐藏沙箱与自动云转写回退，输出拒绝覆盖。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 独立OAuth、有效订阅、真实生成/旁白和模型下载待验收；本地合成媒体不证明付费服务。
- paper样式依赖明确可用字体/Pillow/numpy，faster-whisper需模型和相应环境；本地helper不提供缺失的专有沙箱功能。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
