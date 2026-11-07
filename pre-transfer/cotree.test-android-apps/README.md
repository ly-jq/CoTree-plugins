# Android 应用测试

复用 CoTree Android 设备能力完成应用流程验证、证据采集和 CPU / 帧时间 / 内存分析。

- 插件：cotree.test-android-apps，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 18 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.test-android-apps.connect（显式调用）
- Skill：cotree.test-android-apps.build（显式调用）
- Skill：cotree.test-android-apps.qa
- Skill：cotree.test-android-apps.locate
- Skill：cotree.test-android-apps.capture（显式调用）
- Skill：cotree.test-android-apps.cpu（显式调用）
- Skill：cotree.test-android-apps.timeline（显式调用）
- Skill：cotree.test-android-apps.memory（显式调用）



## 改造内容

- 两项来源Skill改为八项原生工作流，设备连接与交互复用现有cotree.android-device。
- 补齐跨平台二进制ADB采集与UTF-8 UI唯一节点选择，拒绝覆盖和模糊点击；不清空全局日志或终止无关采样。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 本包原生工作流、辅助工具与安装合同已适配；用户工程、真实模型任务、云服务和设备业务分别验收，不由协议夹具或示例代替。
- 需要明确授权的测试设备 / 模拟器、ADB及目标应用；CPU / heap / trace能力由Android版本、profileable / debuggable与工具链决定。未连接设备不能声称真实QA / 性能通过。
- Python辅助只解析已有XML，Node辅助默认只产生命令计划；实际capture需--execute，仍使用宿主Shell权限。原POSIX报告脚本可选，Windows优先使用NDK / Perfetto官方跨平台工具。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
